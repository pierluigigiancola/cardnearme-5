import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeftRight, MapPin, MessageSquare, Settings } from 'lucide-react'

import { GatedPanel, SignedOut, useRequireAuth } from '#/auth/AuthGate'
import { useViewer } from '#/auth/useViewer'
import { GameBadge } from '#/components/cards/CardBits'
import { DeckTile } from '#/components/decks/DeckTools'
import { PageHeader, Section } from '#/components/layout/PageHeader'
import { useTradeBuilder } from '#/components/trading/TradeBuilder'
import { TradeItems } from '#/components/trading/TradeItems'
import { useStartChat } from '#/components/trading/useStartChat'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { formatNumber } from '#/lib/format'
import { citiesQuery, decksQuery, gamesQuery, storesQuery, tradeItemsQuery, userQuery } from '#/services/queries'

const PREVIEW = 10

export const Route = createFileRoute('/users/$username')({
  loader: async ({ context: { queryClient }, params }) => {
    const user = await queryClient.ensureQueryData(userQuery(params.username))
    if (!user) throw notFound()
    await Promise.all([
      queryClient.ensureQueryData(gamesQuery()),
      queryClient.ensureQueryData(citiesQuery()),
      queryClient.ensureQueryData(storesQuery()),
      queryClient.ensureQueryData(decksQuery({
        limit: 4,
        ownerUsername: user.username,
      })),
      queryClient.ensureQueryData(tradeItemsQuery({
        limit: PREVIEW,
        listType: 'haves',
        ownerUsername: user.username,
      })),
      queryClient.ensureQueryData(tradeItemsQuery({
        limit: PREVIEW,
        listType: 'wants',
        ownerUsername: user.username,
      })),
    ])
    return user
  },
  head: ({ params }) => ({ meta: [{ title: `${params.username} — trader profile | CardNearMe` }] }),
  component: ProfilePage,
})

function ProfilePage() {
  const user = Route.useLoaderData()
  const requireAuth = useRequireAuth()
  const viewer = useViewer()
  const isMe = viewer.kind === 'user' && viewer.username === user.username
  const openTradeBuilder = useTradeBuilder()
  const { isPending: startingChat, startChat } = useStartChat()
  const { data: games } = useSuspenseQuery(gamesQuery())
  const { data: cities } = useSuspenseQuery(citiesQuery())
  const { data: stores } = useSuspenseQuery(storesQuery())
  const { data: decks } = useSuspenseQuery(decksQuery({
    limit: 4,
    ownerUsername: user.username,
  }))
  const { data: haves } = useSuspenseQuery(tradeItemsQuery({
    limit: PREVIEW,
    listType: 'haves',
    ownerUsername: user.username,
  }))
  const { data: wants } = useSuspenseQuery(tradeItemsQuery({
    limit: PREVIEW,
    listType: 'wants',
    ownerUsername: user.username,
  }))
  const userCities = cities.filter(city => user.citySlugs.includes(city.slug))
  const userStores = stores.filter(store => user.storeSlugs.includes(store.slug))

  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{ label: 'Users' }, { label: user.username }]}
        title={(
          <span className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback
                className="text-xl font-bold uppercase"
                style={{ backgroundColor: `oklch(0.6 0.12 ${user.avatarHue} / 0.3)` }}
              >
                {user.username.slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <span>
              {user.username}

              <span className="mt-1 flex flex-wrap gap-1">
                {user.badges.map(badge => (
                  <Badge
                    key={badge}
                    variant="secondary"
                  >
                    {badge}
                  </Badge>
                ))}
              </span>
            </span>
          </span>
        )}
        actions={isMe
          ? (
            <Button
              asChild
              variant="outline"
            >
              <Link to="/x/settings">
                <Settings />
                Edit profile
              </Link>
            </Button>
          )
          : (
            <>
              <Button
                disabled={startingChat}
                onClick={() => requireAuth('message', () => startChat(user.username))}
                variant="outline"
              >
                <MessageSquare />
                Message
              </Button>

              <Button
                onClick={() => requireAuth('trade', () => openTradeBuilder({
                  partner: user.username,
                  useMatches: true,
                }))}
              >
                <ArrowLeftRight />
                Trade
              </Button>
            </>
          )}
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Completed trades', user.completedTrades],
              ['Decks', decks.length],
              ['Haves', haves.total],
              ['Wants', wants.total],
            ].map(([label, value]) => (
              <div
                className="rounded-xl border bg-card p-3"
                key={label}
              >
                <p className="text-xl font-bold tabular-nums">{formatNumber(Number(value))}</p>

                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
            <p className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-4" />

              {userCities.map(city => city.name).join(' · ')}

              {' · member since '}

              {new Date(user.memberSince).getFullYear()}
            </p>

            <div>
              <p className="mb-1 font-semibold">Games</p>

              <div className="flex flex-wrap gap-1">
                {games.filter(game => user.games.includes(game.id)).map(game => (
                  <GameBadge
                    game={game}
                    key={game.id}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 font-semibold">Trades at</p>

              <ul className="space-y-1">
                {userStores.map(store => (
                  <li key={store.slug}>
                    <Link
                      className="text-primary hover:underline"
                      params={{ store: store.slug }}
                      to="/stores/$store"
                    >
                      {store.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-1 font-semibold">Meeting places</p>

              <p className="text-muted-foreground">{user.meetingPlaces.join(', ')}</p>
            </div>
          </div>

          <SignedOut>
            <GatedPanel
              action="matches"
              title={`See what you can trade with ${user.username}`}
            />
          </SignedOut>
        </aside>

        <div>
          {decks.length > 0 && (
            <Section
              description="Deck lists shared by this player"
              title="Decks"
            >
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {decks.map(deck => (
                  <DeckTile
                    deck={deck}
                    key={deck.id}
                  />
                ))}
              </div>
            </Section>
          )}

          <Section
            description={`Cards available for trade from ${user.username}`}
            title={`Available cards (${haves.total})`}
          >
            <TradeItems
              items={haves.items}
              view="visual"
            />
          </Section>

          <Section
            description={`Cards ${user.username} is looking for`}
            title={`Want list (${wants.total})`}
          >
            <TradeItems
              items={wants.items}
              view="table"
            />
          </Section>
        </div>
      </div>
    </div>
  )
}
