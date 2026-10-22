import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { DeckTile } from '#/components/decks/DeckTools'
import { PageHeader, Section } from '#/components/layout/PageHeader'
import { decksQuery, gameQuery } from '#/services/queries'

export const Route = createFileRoute('/decks/$game/')({
  loader: async ({ context: { queryClient }, params }) => {
    const game = await queryClient.ensureQueryData(gameQuery(params.game))
    if (!game) throw notFound()
    await queryClient.ensureQueryData(decksQuery({ gameId: game.id }))
    return game
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.shortName} community decks | CardNearMe` : 'Decks | CardNearMe' }] }),
  component: GameDecksPage,
})

function GameDecksPage() {
  const game = Route.useLoaderData()
  const { data: decks } = useSuspenseQuery(decksQuery({ gameId: game.id }))

  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{
          href: '/decks',
          label: 'Community decks',
        }, { label: game.name }]}
        description={`Explore ${game.name} decks shared by the community`}
        title={`${game.shortName} community decks`}
      />

      {decks.length === 0 && <p className="text-muted-foreground">No decks shared yet.</p>}

      {game.formats.map((format) => {
        const formatDecks = decks.filter(deck => deck.format === format)
        if (formatDecks.length === 0) return null
        return (
          <Section
            action={(
              <Link
                className="flex items-center gap-1 text-sm font-semibold text-primary"
                params={{
                  format: format.toLowerCase(),
                  game: game.id,
                }}
                to="/decks/$game/$format"
              >
                View all
                <ArrowRight className="size-4" />
              </Link>
            )}
            key={format}
            title={`${format} decks`}
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {formatDecks.slice(0, 5).map(deck => (
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
