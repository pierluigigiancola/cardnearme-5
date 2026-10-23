import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Check, ExternalLink, MapPin, Users } from 'lucide-react'
import { toast } from 'sonner'

import { useRequireAuth } from '#/auth/AuthGate'
import { useViewer } from '#/auth/useViewer'
import { ErrorState } from '#/components/layout/ErrorState'
import { PageHeader, Section } from '#/components/layout/PageHeader'
import { StoreMap } from '#/components/places/Places'
import { MatchList } from '#/components/trading/MatchList'
import { HeadStartSteps, ShareButton, UnlockProgress } from '#/components/trading/Promos'
import { TradeItems } from '#/components/trading/TradeItems'
import { Button } from '#/components/ui/button'
import { useWorkspaceMutation } from '#/services/mutations'
import { cityQuery, matchesQuery, profileQuery, storeQuery, storesQuery, tradeItemsQuery } from '#/services/queries'
import type { Store } from '#/services/types'

const PREVIEW = 8

export const Route = createFileRoute('/stores/$store')({
  loader: async ({ context: { queryClient, viewer }, params }) => {
    const store = await queryClient.ensureQueryData(storeQuery(params.store))
    if (!store) throw notFound()
    const city = await queryClient.ensureQueryData(cityQuery(store.citySlug))
    if (!city) throw notFound()
    await Promise.all([
      queryClient.ensureQueryData(tradeItemsQuery({
        limit: PREVIEW,
        listType: 'haves',
        storeSlug: store.slug,
      })),
      queryClient.ensureQueryData(tradeItemsQuery({
        limit: PREVIEW,
        listType: 'wants',
        storeSlug: store.slug,
      })),
      // Signed-in traders see their matches at this store first.
      viewer.kind === 'user' && viewer.onboarded
        ? Promise.all([
          queryClient.ensureQueryData(matchesQuery(viewer.id, { storeSlug: store.slug })),
          queryClient.ensureQueryData(storesQuery()),
        ])
        : null,
    ])
    return {
      city,
      store,
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.store.name} | CardNearMe` : 'Store | CardNearMe' }] }),
  component: StorePage,
})

function StorePage() {
  const { city, store } = Route.useLoaderData()
  const viewer = useViewer()
  const requireAuth = useRequireAuth()
  const { data: haves } = useSuspenseQuery(tradeItemsQuery({
    limit: PREVIEW,
    listType: 'haves',
    storeSlug: store.slug,
  }))
  const { data: wants } = useSuspenseQuery(tradeItemsQuery({
    limit: PREVIEW,
    listType: 'wants',
    storeSlug: store.slug,
  }))
  const unlocked = city.traderCount >= city.unlockThreshold
  const profileResult = useQuery({
    ...profileQuery(viewer.kind === 'user' ? viewer.id : 'anonymous'),
    enabled: viewer.kind === 'user',
  })
  const joined = profileResult.data?.storeSlugs.includes(store.slug) ?? false
  // Unknown when the profile failed: don't offer "Join store" to someone who may have joined.
  const membership = profileResult.isError ? 'unknown' : joined ? 'joined' : 'not-joined'
  const join = useWorkspaceMutation((services, slug: string) => services.profile.joinStore(slug))

  return (
    <div className="page-wrap">
      <PageHeader
        actions={(
          <>
            <ShareButton label="Copy link" />

            {membership === 'unknown' && (
              <ErrorState
                compact
                error={profileResult.error}
                onRetry={() => void profileResult.refetch()}
                title="Could not load your stores"
              />
            )}

            {membership === 'joined' && (
              <Button
                asChild
                variant="outline"
              >
                <Link
                  params={{ store: store.slug }}
                  to="/x/stores/$store"
                >
                  <Check />
                  Joined · open
                </Link>
              </Button>
            )}

            {membership === 'not-joined' && (
              <Button
                disabled={join.isPending}
                onClick={() => requireAuth('joinStore', () => join.mutate(store.slug, { onSuccess: () => toast.success(`Joined ${store.name}`) }))}
              >
                <Users />
                Join store
              </Button>
            )}
          </>
        )}
        crumbs={[{
          href: '/stores',
          label: 'Stores',
        }, { label: store.name }]}
        description={`Browse available cards and find trading opportunities at ${store.name}`}
        title={store.name}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {unlocked
            ? (
              <>
                {viewer.kind === 'user' && viewer.onboarded && (
                  <StoreMatches
                    joined={joined}
                    store={store}
                    viewerId={viewer.id}
                  />
                )}

                <Section
                  action={(
                    <Link
                      className="text-sm font-semibold text-primary"
                      params={{ city: city.slug }}
                      to="/city/$city/haves"
                    >
                      View all
                      {' '}

                      {haves.total}

                      {' →'}
                    </Link>
                  )}
                  description="Cards available for trade at this store"
                  title="Haves"
                >
                  <TradeItems
                    items={haves.items}
                    view="visual"
                  />
                </Section>

                <Section
                  action={(
                    <Link
                      className="text-sm font-semibold text-primary"
                      params={{ city: city.slug }}
                      to="/city/$city/wants"
                    >
                      View all
                      {' '}

                      {wants.total}

                      {' →'}
                    </Link>
                  )}
                  description="Cards players are looking for at this store"
                  title="Wants"
                >
                  <TradeItems
                    items={wants.items}
                    view="visual"
                  />
                </Section>
              </>
            )
            : (
              <div className="space-y-6">
                <UnlockProgress city={city} />

                <HeadStartSteps />
              </div>
            )}
        </div>

        <aside className="space-y-4">
          <StoreMap stores={[store]} />

          <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
            <Link
              className="flex items-center gap-2 font-semibold text-primary"
              params={{ city: city.slug }}
              to="/city/$city"
            >
              <MapPin className="size-4" />

              {city.name}

              {' trading'}
            </Link>

            <p className="text-muted-foreground">{store.address}</p>

            {store.website && (
              <a
                className="flex items-center gap-1 text-primary"
                href={store.website}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-3" />
                Website
              </a>
            )}

            <p className="flex items-center gap-1 text-muted-foreground">
              <Users className="size-3" />

              {store.traderCount}

              {' traders'}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="font-semibold">Is this your store?</p>

            <p className="text-muted-foreground">Claim this page to manage your listing and connect with traders.</p>

            <Link
              className="mt-2 inline-block font-semibold text-primary"
              to="/contact"
            >
              Claim page →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

function StoreMatches({ joined, store, viewerId }: {
  store: Store;
  viewerId: string;
  joined: boolean
}) {
  const { data: matches } = useSuspenseQuery(matchesQuery(viewerId, { storeSlug: store.slug }))
  const { data: stores } = useSuspenseQuery(storesQuery())
  return (
    <Section
      description={joined ? 'Traders at this store whose lists match yours' : 'Traders here whose lists match yours — join the store to meet them here'}
      title={`Your matches (${matches.length})`}
    >
      <MatchList
        matches={matches}
        storeNames={Object.fromEntries(stores.map(candidate => [candidate.slug, candidate.name]))}
      />
    </Section>
  )
}
