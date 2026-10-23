import { PostHogProvider as BasePostHogProvider } from '@posthog/react'
import posthog from 'posthog-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

import { applyConsent, readConsent, saveConsent } from '#/lib/consent'
import type { AnalyticsClient, ConsentChoice } from '#/lib/consent'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined

/**
 * PostHog behind the consent seam: `posthog.init` only runs once the visitor
 * accepts, so nothing loads or captures before that.
 */
const analytics: AnalyticsClient = {
  isLoaded: () => posthog.__loaded,
  load: () => {
    if (!posthogKey) return
    posthog.init(posthogKey, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: false,
      defaults: '2025-11-30',
      person_profiles: 'identified_only',
    })
    // PostHog remembers an earlier opt-out in its own storage.
    if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing()
  },
  optIn: () => posthog.opt_in_capturing(),
  optOut: () => posthog.opt_out_capturing(),
}

function browserStorage() {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  }
  catch {
    return undefined
  }
}

interface ConsentContextValue {
  /** `undefined` until read on the client, `null` if the visitor hasn't chosen. */
  choice: ConsentChoice | null | undefined
  decide: (choice: ConsentChoice) => void
  settingsOpen: boolean
  openSettings: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

interface PostHogProviderProps { children: ReactNode }

// The stored choice as an external store; the server snapshot is `undefined`
// so server and hydrated markup match and the banner appears after hydration.
let storedChoice: ConsentChoice | null | undefined
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  if (storedChoice === undefined) storedChoice = readConsent(browserStorage())
  return storedChoice
}

function getServerSnapshot() {
  return undefined
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (choice !== undefined) applyConsent(choice, analytics)
  }, [choice])

  const decide = useCallback((next: ConsentChoice) => {
    saveConsent(browserStorage(), next)
    storedChoice = next
    listeners.forEach(listener => listener())
    setSettingsOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      choice,
      decide,
      openSettings: () => setSettingsOpen(true),
      settingsOpen,
    }),
    [choice, decide, settingsOpen],
  )

  return (
    <ConsentContext value={value}>
      <BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>
    </ConsentContext>
  )
}

export function useConsent() {
  const context = useContext(ConsentContext)
  if (!context) throw new Error('useConsent must be used inside PostHogProvider')
  return context
}
