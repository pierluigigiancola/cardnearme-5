import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { PageHeader } from '#/components/layout/PageHeader'
import { gamesQuery, setsQuery } from '#/services/queries'
import type { Game } from '#/services/types'

export const Route = createFileRoute('/sets/')({
  loader: async ({ context: { queryClient } }) => {
    const games = await queryClient.ensureQueryData(gamesQuery())
    await Promise.all(games.map(game => queryClient.ensureQueryData(setsQuery(game.id))))
  },
  head: () => ({ meta: [{ title: 'Browse TCG card sets | CardNearMe' }] }),
  component: GamesPage,
})

function GamesPage() {
  const { data: games } = useSuspenseQuery(gamesQuery())
  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{ label: 'Sets' }]}
        description="Discover cards across every supported game. Compare prices and build your collection."
        title="Browse trading card game sets"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map(game => (
          <GameCard
            game={game}
            key={game.id}
          />
        ))}
      </div>
    </div>
  )
}

function GameCard({ game }: { game: Game }) {
  const { data: sets } = useSuspenseQuery(setsQuery(game.id))
  return (
    <Link
      className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 transition hover:border-primary/60"
      params={{ game: game.id }}
      style={{ backgroundImage: `radial-gradient(400px 160px at 100% 0%, oklch(0.7 0.12 ${game.hue} / 0.18), transparent)` }}
      to="/sets/$game"
    >
      <p className="text-lg font-bold">{game.name}</p>

      <p className="text-sm text-muted-foreground">{game.tagline}</p>

      <div className="mt-auto flex items-center justify-between text-sm">
        <span className="font-semibold">
          {sets.length}

          {' sets'}
        </span>

        <span className="flex items-center gap-1 font-semibold text-primary">
          Browse sets
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
