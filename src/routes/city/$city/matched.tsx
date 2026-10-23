import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Loader2, Sparkles } from 'lucide-react'

import { GatedPanel, SignedIn, SignedOut } from '#/auth/AuthGate'
import { useSignedInViewer } from '#/auth/useViewer'
import { ErrorState } from '#/components/layout/ErrorState'
import { PageHeader } from '#/components/layout/PageHeader'
import { MatchList } from '#/components/trading/MatchList'
import { Button } from '#/components/ui/button'
import { cityQuery, matchesQuery, storesQuery } from '#/services/queries'
import type { City } from '#/services/types'

export const Route = createFileRoute('/city/$city/matched')({
  loader: async ({ context: { queryClient }, params }) => {
    const city = await queryClient.ensureQueryData(cityQuery(params.city))
    if (!city) throw notFound()
    return city
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `Matched trades in ${loaderData.name} | CardNearMe` : 'CardNearMe' }] }),
  component: MatchedPage,
})

function MatchedPage() {
  const city = Route.useLoaderData()
  const label = `${city.name}, ${city.country}`

  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{
          href: '/city',
          label: 'City',
        }, {
          href: `/city/${city.slug}`,
          label,
        }, { label: 'Matched trades' }]}
        description={`Cards that match between your lists and players in ${label}`}
        title={`Matched trades in ${label}`}
      />

      <SignedOut>
        <GatedPanel
          action="matches"
          className="mx-auto max-w-lg"
          title="Sign in to see your matches"
        />
      </SignedOut>

      <SignedIn>
        <CityMatches city={city} />
      </SignedIn>
    </div>
  )
}

function CityMatches({ city }: { city: City }) {
  const viewer = useSignedInViewer()
  const matchesResult = useQuery(matchesQuery(viewer.id, { citySlug: city.slug }))
  const storesResult = useQuery(storesQuery(city.slug))
  const stores = storesResult.data ?? []

  if (matchesResult.isPending) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Finding your matches…
      </p>
    )
  }
  if (matchesResult.isError || storesResult.isError) {
    return (
      <ErrorState
        error={matchesResult.error ?? storesResult.error}
        onRetry={() => {
          void matchesResult.refetch()
          void storesResult.refetch()
        }}
        title="Could not load your matches"
      />
    )
  }
  return (
    <MatchList
      empty={(
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <Sparkles className="size-6 text-match" />

          <p className="font-semibold">No matched cards yet</p>

          <p className="text-sm text-muted-foreground">Add cards to your wants list and we will notify you when players in this city have them for trade.</p>

          <Button
            asChild
            variant="outline"
          >
            <Link
              search={{ city: city.slug }}
              to="/stores"
            >
              Browse stores nearby
            </Link>
          </Button>
        </div>
      )}
      matches={matchesResult.data}
      storeNames={Object.fromEntries(stores.map(store => [store.slug, store.name]))}
    />
  )
}
