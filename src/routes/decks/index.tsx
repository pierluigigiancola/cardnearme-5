import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { DeckTile } from '#/components/decks/DeckTools'
import { PageHeader, Section } from '#/components/layout/PageHeader'
import { decksQuery, gamesQuery } from '#/services/queries'

export const Route = createFileRoute('/decks/')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(gamesQuery()),
      queryClient.ensureQueryData(decksQuery()),
    ])
  },
  head: () => ({ meta: [{ title: 'Community decks | CardNearMe' }] }),
  component: DecksPage,
})

function DecksPage() {
  const { data: games } = useSuspenseQuery(gamesQuery())
  const { data: decks } = useSuspenseQuery(decksQuery())
  const deckGames = games.filter(game => game.capabilities.deckBuilder)

  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{ label: 'Community decks' }]}
        description="Choose a game to explore decks shared by the community"
        title="Community decks"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {deckGames.map(game => (
          <Link
            className="rounded-2xl border bg-card p-5 transition hover:border-primary/60"
            key={game.id}
            params={{ game: game.id }}
            style={{ backgroundImage: `radial-gradient(300px 120px at 100% 0%, oklch(0.7 0.12 ${game.hue} / 0.18), transparent)` }}
            to="/decks/$game"
          >
            <p className="font-bold">{game.name}</p>

            <p className="text-sm text-muted-foreground">
              Build, share and explore
              {' '}

              {game.shortName}

              {' deck lists'}
            </p>
          </Link>
        ))}
      </div>

      {deckGames.map((game) => {
        const gameDecks = decks.filter(deck => deck.gameId === game.id).slice(0, 5)
        if (gameDecks.length === 0) return null
        return (
          <Section
            action={(
              <Link
                className="flex items-center gap-1 text-sm font-semibold text-primary"
                params={{ game: game.id }}
                to="/decks/$game"
              >
                View all
                <ArrowRight className="size-4" />
              </Link>
            )}
            key={game.id}
            title={`${game.name} decks`}
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {gameDecks.map(deck => (
                <DeckTile
                  deck={deck}
                  key={deck.id}
                />
              ))}
            </div>
          </Section>
        )
      })}
    </div>
  )
}
