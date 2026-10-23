import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Package } from 'lucide-react'
import { useCallback } from 'react'

import { BrowseToolbar, FacetSidebar } from '#/components/browse/BrowseControls'
import { CardList } from '#/components/cards/CardList'
import { PageHeader } from '#/components/layout/PageHeader'
import { SignupPromo } from '#/components/trading/Promos'
import { Button } from '#/components/ui/button'
import { pickSort, validateBrowseSearch } from '#/lib/browseSearch'
import type { BrowseSearch } from '#/lib/browseSearch'
import { setPrintingsQuery, gameQuery, setQuery } from '#/services/queries'
import type { PrintingQuery, CardSet } from '#/services/types'

const sortOptions = [
  {
    label: 'Number',
    value: 'number',
  },
  {
    label: 'Name',
    value: 'name',
  },
  {
    label: 'Price',
    value: 'price',
  },
  {
    label: 'Price change',
    value: 'priceChange',
  },
  {
    label: 'Rarity',
    value: 'rarity',
  },
] as const
const sortValues = sortOptions.map(option => option.value)

function buildPrintingQuery(set: CardSet, search: BrowseSearch): PrintingQuery {
  return {
    facets: search.f,
    gameId: set.gameId,
    order: search.order ?? 'asc',
    q: search.q,
    setCode: set.code,
    sort: pickSort(search.sort, sortValues, 'number'),
  }
}

export const Route = createFileRoute('/sets/$game/$set/')({
  validateSearch: validateBrowseSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps, params }) => {
    const game = await queryClient.ensureQueryData(gameQuery(params.game))
    if (!game) throw notFound()
    const set = await queryClient.ensureQueryData(setQuery(game.id, params.set))
    if (!set) throw notFound()
    await queryClient.ensureQueryData(setPrintingsQuery(buildPrintingQuery(set, deps)))
    return {
      game,
      set,
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.set.name} prices & card list | CardNearMe` : 'Set | CardNearMe' }] }),
  component: SetPage,
})

function SetPage() {
  const { game, set } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = buildPrintingQuery(set, search)
  const { data } = useSuspenseQuery(setPrintingsQuery(query))
  const onChange = useCallback(
    (update: (previous: BrowseSearch) => BrowseSearch) => void navigate({
      replace: true,
      search: update,
    }),
    [navigate],
  )

  return (
    <div className="page-wrap">
      <PageHeader
        actions={(
          <Button
            asChild
            variant="outline"
          >
            <Link
              params={{
                game: game.id,
                set: set.code,
              }}
              to="/sets/$game/$set/sealed"
            >
              <Package />
              Sealed products
            </Link>
          </Button>
        )}
        crumbs={[{
          href: '/sets',
          label: 'Sets',
        }, {
          href: `/sets/${game.id}`,
          label: game.name,
        }, { label: set.name }]}
        description={`${set.name} (${set.code.toUpperCase()}) — browse the card list, track prices and find local trades.`}
        title={set.name}
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="space-y-6">
          <SignupPromo description={`Pick the ${set.name} cards you want. We will match you with nearby players who have them.`} />

          <FacetSidebar
            facets={data.facets}
            onChange={onChange}
            search={search}
          />
        </div>

        <div className="space-y-4">
          <BrowseToolbar
            onChange={onChange}
            order={query.order ?? 'asc'}
            placeholder="Search for a card"
            search={search}
            shown={data.items.length}
            sort={query.sort ?? 'number'}
            sortOptions={[...sortOptions]}
            total={set.cardCount}
          />

          <CardList
            cards={data.items}
            view={search.view ?? 'visual'}
          />
        </div>
      </div>
    </div>
  )
}
