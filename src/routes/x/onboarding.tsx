import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, Loader2, LockKeyhole, MapPin, Search, Users } from 'lucide-react'
import { useState } from 'react'

import { sanitizeRedirect } from '#/auth/AuthForm'
import { useRefreshViewer } from '#/auth/useViewer'
import { Logo } from '#/components/brand/Logo'
import { ErrorState } from '#/components/layout/ErrorState'
import { StoreMap } from '#/components/places/Places'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Switch } from '#/components/ui/switch'
import { STORE_JOIN_CAP } from '#/domain'
import { cn } from '#/lib/utils'
import { useWorkspaceMutation } from '#/services/mutations'
import { citiesQuery, detectedCityQuery, profileQuery, storesQuery } from '#/services/queries'
import type { OnboardingInput } from '#/services/types'

export const Route = createFileRoute('/x/onboarding')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({ redirect: sanitizeRedirect(search.redirect) }),
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(citiesQuery()),
      queryClient.ensureQueryData(detectedCityQuery()),
    ])
  },
  head: () => ({ meta: [{ title: 'Welcome | CardNearMe' }] }),
  component: OnboardingPage,
})

function OnboardingPage() {
  const { user } = Route.useRouteContext()
  const { redirect } = Route.useSearch()
  const router = useRouter()
  const refresh = useRefreshViewer()
  const { data: profile } = useSuspenseQuery(profileQuery(user.id))
  const { data: cities } = useSuspenseQuery(citiesQuery())
  const { data: detected } = useSuspenseQuery(detectedCityQuery())
  const [step, setStep] = useState<'city' | 'stores'>('city')
  const [citySlug, setCitySlug] = useState(profile.citySlug ?? detected.slug)
  const [storeSlugs, setStoreSlugs] = useState<string[]>(profile.storeSlugs)
  const [showStores, setShowStores] = useState(profile.showStoresOnProfile)
  const [query, setQuery] = useState('')
  const city = cities.find(candidate => candidate.slug === citySlug)
  const storesResult = useQuery(storesQuery(citySlug))
  const { data: stores = [], isPending: storesPending } = storesResult
  const full = storeSlugs.length >= STORE_JOIN_CAP

  const save = useWorkspaceMutation((services, input: OnboardingInput) => services.profile.completeOnboarding(input))
  const [finishing, setFinishing] = useState(false)

  const toggleStore = (slug: string) => setStoreSlugs((current) => {
    if (current.includes(slug)) return current.filter(other => other !== slug)
    return current.length >= STORE_JOIN_CAP ? current : [...current, slug]
  })

  const finish = async () => {
    setFinishing(true)
    try {
      await save.mutateAsync({
        citySlug,
        showStoresOnProfile: showStores,
        storeSlugs,
      })
      // The `/x` guard reads `profile.onboardedAt`, which the mutation just set and refetched.
      await refresh()
      await router.navigate({ href: redirect ?? '/x/binder' })
    }
    catch {
      setFinishing(false)
    }
  }

  const visibleCities = cities.filter(candidate => `${candidate.name} ${candidate.country}`.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="page-wrap max-w-4xl py-10">
      <div className="mb-8 space-y-2 text-center">
        <Logo className="justify-center text-xl" />

        <h1 className="text-3xl font-extrabold">{`Welcome, ${user.username}!`}</h1>

        <p className="text-muted-foreground">Tell us where you play so we can match you with traders nearby.</p>
      </div>

      <ol className="mb-6 flex justify-center gap-2 text-sm">
        {(['city', 'stores'] as const).map((item, index) => (
          <li
            className={cn('flex items-center gap-2 rounded-full border px-3 py-1', item === step ? 'border-primary bg-primary/10 font-semibold text-primary' : 'text-muted-foreground')}
            key={item}
          >
            <span className="tabular-nums">{index + 1}</span>

            {item === 'city' ? 'Your city' : 'Trading locations'}
          </li>
        ))}
      </ol>

      {step === 'city'
        ? (
          <section className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-bold">Where do you play?</h2>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                aria-label="Search cities"
                className="pl-9"
                onChange={event => setQuery(event.target.value)}
                placeholder="Search your city"
                value={query}
              />
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
              {visibleCities.map((candidate) => {
                const unlocked = candidate.traderCount >= candidate.unlockThreshold
                return (
                  <li key={candidate.slug}>
                    <button
                      aria-pressed={candidate.slug === citySlug}
                      className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-primary/60', candidate.slug === citySlug && 'border-primary bg-primary/10')}
                      onClick={() => {
                        if (candidate.slug !== citySlug) setStoreSlugs([])
                        setCitySlug(candidate.slug)
                      }}
                      type="button"
                    >
                      <MapPin className="size-5 shrink-0 text-primary" />

                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{`${candidate.name}, ${candidate.country}`}</span>

                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3" />

                          {`${candidate.traderCount} traders`}

                          {candidate.slug === detected.slug && ' · near you'}
                        </span>
                      </span>

                      {unlocked
                        ? <span className="rounded-full bg-want/15 px-2 py-0.5 text-[11px] font-semibold text-want">Trading open</span>
                        : (
                          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            <LockKeyhole className="size-3" />
                            Unlocking
                          </span>
                        )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="flex justify-end">
              <Button
                disabled={!city}
                onClick={() => setStep('stores')}
              >
                Continue
                <ArrowRight />
              </Button>
            </div>
          </section>
        )
        : (
          <section className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">{`Pick your trading locations in ${city?.name ?? 'your city'}`}</h2>

                <p className="text-sm text-muted-foreground">{`Choose up to ${STORE_JOIN_CAP} stores where you are happy to meet. Trade proposals suggest them as meetup spots.`}</p>
              </div>

              <span className={cn('rounded-full px-3 py-1 text-sm font-semibold tabular-nums', full ? 'bg-have/15 text-have' : 'bg-muted')}>{`${storeSlugs.length} / ${STORE_JOIN_CAP}`}</span>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
              <StoreMap
                className="min-h-72"
                onSelect={toggleStore}
                selected={storeSlugs}
                stores={stores}
              />

              <ul className="max-h-80 divide-y overflow-y-auto rounded-xl border">
                {storesPending && (
                  <li className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading stores…
                  </li>
                )}

                {stores.map((store) => {
                  const checked = storeSlugs.includes(store.slug)
                  return (
                    <li key={store.slug}>
                      <label className={cn('flex cursor-pointer items-center gap-3 px-3 py-2.5', !checked && full && 'cursor-not-allowed opacity-50')}>
                        <Checkbox
                          checked={checked}
                          disabled={!checked && full}
                          onCheckedChange={() => toggleStore(store.slug)}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{store.name}</span>

                          <span className="block truncate text-xs text-muted-foreground">{store.address}</span>
                        </span>

                        <span className="text-xs text-muted-foreground tabular-nums">{`${store.traderCount} traders`}</span>
                      </label>
                    </li>
                  )
                })}

                {storesResult.isError && (
                  <li>
                    <ErrorState
                      compact
                      error={storesResult.error}
                      onRetry={() => void storesResult.refetch()}
                      title="Could not load stores"
                    />
                  </li>
                )}

                {storesResult.isSuccess && stores.length === 0 && <li className="p-4 text-sm text-muted-foreground">No stores listed in this city yet — you can add them later.</li>}
              </ul>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
              <span>
                <span className="block font-medium">Show my stores on my profile</span>

                <span className="block text-sm text-muted-foreground">Other traders see where you are happy to meet.</span>
              </span>

              <Switch
                aria-label="Show my stores on my profile"
                checked={showStores}
                onCheckedChange={setShowStores}
              />
            </label>

            <div className="flex justify-between gap-2">
              <Button
                onClick={() => setStep('city')}
                variant="ghost"
              >
                <ArrowLeft />
                Back
              </Button>

              <Button
                disabled={finishing}
                onClick={() => void finish()}
              >
                {finishing ? <Loader2 className="animate-spin" /> : <Check />}

                {storeSlugs.length === 0 ? 'Skip stores for now' : 'Continue'}
              </Button>
            </div>
          </section>
        )}
    </div>
  )
}
