import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'

import { DeckTile } from '#/components/decks/DeckTools'
import { PageHeader } from '#/components/layout/PageHeader'
import { decksQuery, gameQuery } from '#/services/queries'

export const Route = createFileRoute('/decks/$game/$format/')({
  loader: async ({ context: { queryClient }, params }) => {
    const game = await queryClient.ensureQueryData(gameQuery(params.game))
    if (!game) throw notFound()
    const format = game.formats.find(option => option.toLowerCase() === params.format.toLowerCase())
    if (!format) throw notFound()
    await queryClient.ensureQueryData(decksQuery({
      format,
      gameId: game.id,
    }))
    return {
      format,
      game,
    }
  },
  component: FormatDecksPage,
})

function FormatDecksPage() {
  const { format, game } = Route.useLoaderData()
  const { data: decks } = useSuspenseQuery(decksQuery({
    format,
    gameId: game.id,
  }))

  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{
          href: '/decks',
          label: 'Community decks',
        }, {
          href: `/decks/${game.id}`,
          label: game.name,
        }, { label: format }]}
        description={`${decks.length} ${format} decks shared by the community`}
        title={`${format} decks`}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {decks.map(deck => (
          <DeckTile
            deck={deck}
            key={deck.id}
          />
        ))}
      </div>
    </div>
  )
}
