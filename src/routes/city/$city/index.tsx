import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowRight, ArrowLeftRight, Bell, Package, Search, Sparkles } from 'lucide-react'

import { SignedIn, SignedOut } from '#/auth/AuthGate'
import { PageHeader, Section } from '#/components/layout/PageHeader'
import { StoreList, StoreMap } from '#/components/places/Places'
import { HeadStartSteps, ShareButton, UnlockProgress } from '#/components/trading/Promos'
import { Button } from '#/components/ui/button'
import { formatNumber } from '#/lib/format'
import { cityQuery, cityTradeStatsQuery, storesQuery } from '#/services/queries'

export const Route = createFileRoute('/city/$city/')({
  loader: async ({ context: { queryClient }, params }) => {
    const city = await queryClient.ensureQueryData(cityQuery(params.city))
    if (!city) throw notFound()
    await Promise.all([
      queryClient.ensureQueryData(storesQuery(city.slug)),
      queryClient.ensureQueryData(cityTradeStatsQuery(city.slug)),
    ])
    return city
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `Trade cards in ${loaderData.name}, ${loaderData.country} | CardNearMe` : 'City | CardNearMe' }] }),
  component: CityPage,
})

const unlockFeatures = [
  {
    icon: Package,
    text: 'See every card available for trade across all stores in the city.',
    title: 'Browse haves',
  },
  {
    icon: Search,
    text: 'Find out which cards other players are looking for.',
    title: 'Browse wants',
  },
  {
    icon: Sparkles,
    text: 'Propose trades to the players you match with. Your matches already show.',
    title: 'Trade proposals',
  },
  {
    icon: Bell,
    text: 'Get notified when someone lists a card you want at a local store.',
    title: 'Trade alerts',
  },
]

function CityPage() {
  const { city: slug } = Route.useParams()
  const { data: city } = useSuspenseQuery(cityQuery(slug))
  const { data: stores } = useSuspenseQuery(storesQuery(slug))
  const { data: stats } = useSuspenseQuery(cityTradeStatsQuery(slug))
  if (!city) return null
  const unlocked = city.traderCount >= city.unlockThreshold
  const label = `${city.name}, ${city.country}`

  return (
    <div className="page-wrap">
      <PageHeader
        actions={unlocked && (
          <dl className="flex gap-6">
            {[
              ['Traders', city.traderCount, 'across the city'],
              ['Trades', city.tradeCount, 'completed'],
              ['Stores', stores.length, 'places to meet'],
            ].map(([term, value, hint]) => (
              <div key={term}>
                <dt className="text-xs text-muted-foreground uppercase">{term}</dt>

                <dd className="text-2xl font-extrabold tabular-nums">{formatNumber(Number(value))}</dd>

                <dd className="text-xs text-muted-foreground">{hint}</dd>
              </div>
            ))}
          </dl>
        )}
        crumbs={[{
          href: '/city',
          label: 'City',
        }, { label }]}
        description={unlocked ? 'Browse cards for trade, see what players need, and check your matches.' : undefined}
        title={unlocked ? `Trade cards in ${label}` : label}
      />

      {unlocked
        ? (
          <Section
            description="Choose a starting point, then search and filter the complete local inventory."
            title="How do you want to trade?"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <EntryCard
                accent="text-have"
                count={stats.haves}
                countLabel="cards available"
                description={`Search cards offered by players across ${label}.`}
                icon={<Package className="size-5" />}
                link={(
                  <Link
                    className="font-semibold text-have"
                    params={{ city: slug }}
                    to="/city/$city/haves"
                  >
                    Browse haves →
                  </Link>
                )}
                title="Find cards for trade"
              />

              <EntryCard
                accent="text-want"
                count={stats.wants}
                countLabel="cards wanted"
                description="Find players nearby who are already looking for cards you can offer."
                icon={<Search className="size-5" />}
                link={(
                  <Link
                    className="font-semibold text-want"
                    params={{ city: slug }}
                    to="/city/$city/wants"
                  >
                    Browse wants →
                  </Link>
                )}
                title="See what traders need"
              />

              <EntryCard
                accent="text-match"
                description="Use your haves and wants to find trades that work for both players."
                icon={<ArrowLeftRight className="size-5" />}
                link={(
                  <Link
                    className="font-semibold text-match"
                    params={{ city: slug }}
                    to="/city/$city/matched"
                  >
                    View matches →
                  </Link>
                )}
                title="Start with a mutual trade"
              >
                <SignedOut>
                  <p className="text-sm text-muted-foreground">Sign in to see your matches in this city.</p>
                </SignedOut>

                <SignedIn>
                  <p className="text-sm text-muted-foreground">Matches update as players add cards.</p>
                </SignedIn>
              </EntryCard>
            </div>
          </Section>
        )
        : (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <UnlockProgress city={city} />

            <div className="space-y-3 rounded-xl border bg-card p-5">
              <p className="font-bold">
                What unlocks at
                {' '}

                {city.unlockThreshold}

                {' '}
                traders?
              </p>

              <ul className="grid gap-3 sm:grid-cols-2">
                {unlockFeatures.map(feature => (
                  <li
                    className="flex gap-3"
                    key={feature.title}
                  >
                    <feature.icon className="mt-0.5 size-4 shrink-0 text-primary" />

                    <div>
                      <p className="text-sm font-semibold">{feature.title}</p>

                      <p className="text-xs text-muted-foreground">{feature.text}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <Link
                className="inline-block text-sm font-semibold text-match"
                params={{ city: slug }}
                to="/city/$city/matched"
              >
                See your matches now →
              </Link>
            </div>

            <div className="lg:col-span-2">
              <Section
                description="Get a head start while the community grows."
                title="What you can do right now"
              >
                <HeadStartSteps />
              </Section>
            </div>
          </div>
        )}

      <Section
        action={(
          <Button
            asChild
            variant="outline"
          >
            <Link
              search={{ city: slug }}
              to="/stores"
            >
              Browse all stores
              <ArrowRight />
            </Link>
          </Button>
        )}
        description={`Stores that connect traders across ${label}.`}
        title="Where trading happens"
      >
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <StoreMap stores={stores} />

          <StoreList stores={stores} />
        </div>
      </Section>

      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-8 text-center">
        <p className="text-lg font-bold">
          Know someone who trades in
          {' '}

          {city.name}
          ?
        </p>

        <p className="text-sm text-muted-foreground">Invite them to join the trading network.</p>

        <ShareButton label="Invite a trader" />
      </div>
    </div>
  )
}

function EntryCard({ accent, children, count, countLabel, description, icon, link, title }: {
  accent: string
  count?: number
  countLabel?: string
  description: string
  icon: React.ReactNode
  link: React.ReactNode
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <span className={accent}>{icon}</span>

      <div>
        <p className="font-bold">{title}</p>

        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {count !== undefined && (
        <p>
          <span className={`text-2xl font-extrabold tabular-nums ${accent}`}>{formatNumber(count)}</span>

          {' '}

          <span className="text-sm text-muted-foreground">{countLabel}</span>
        </p>
      )}

      {children}

      <div className="mt-auto text-sm">{link}</div>
    </div>
  )
}
