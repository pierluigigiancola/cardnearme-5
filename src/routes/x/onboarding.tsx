import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { sanitizeRedirect } from '#/auth/AuthForm'
import { useRefreshViewer } from '#/auth/useViewer'
import { WorkspacePlaceholder } from '#/components/layout/WorkspacePlaceholder'
import { Button } from '#/components/ui/button'
import { getSupabaseBrowserClient } from '#/supabase/supabase.browser'

export const Route = createFileRoute('/x/onboarding')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({ redirect: sanitizeRedirect(search.redirect) }),
  head: () => ({ meta: [{ title: 'Welcome | CardNearMe' }] }),
  component: OnboardingPage,
})

function OnboardingPage() {
  const { user } = Route.useRouteContext()
  const { redirect } = Route.useSearch()
  const router = useRouter()
  const refresh = useRefreshViewer()
  const [pending, setPending] = useState(false)

  const finish = async () => {
    setPending(true)
    if (!user.demo) {
      // Ticket 02: persist city, stores and preferences through a profile service.
      await getSupabaseBrowserClient().auth.updateUser({ data: { onboarded: true } })
    }
    await refresh()
    await router.navigate({ href: redirect ?? '/x/binder' })
  }

  return (
    <>
      <WorkspacePlaceholder
        description={`Welcome, ${user.username}! Set up your city and stores to discover local trades.`}
        features={[
          'Pick the city where you play',
          'Select up to 5 stores as trading locations (map + list)',
          'Choose whether your stores are visible on your profile',
        ]}
        title="Welcome to CardNearMe"
      />

      <div className="page-wrap mt-6">
        <Button
          disabled={pending}
          onClick={() => void finish()}
        >
          Continue
        </Button>
      </div>
    </>
  )
}
