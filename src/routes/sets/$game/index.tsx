import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Price } from '#/components/cards/CardBits'
import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { pickSort } from '#/lib/browseSearch'
import { formatDate } from '#/lib/format'
import { gameQuery, setsQuery } from '#/services/queries'
import type { SortOrder } from '#/services/types'

const sortOptions = [
  {
    label: 'Release date',
    value: 'releasedAt',
  },
  {
    label: 'Name',
    value: 'name',
  },
  {
    label: 'Code',
    value: 'code',
  },
  {
    label: 'Total cards',
    value: 'cardCount',
  },
  {
    label: 'Market cap',
    value: 'marketCap',
  },
] as const
const sortValues = sortOptions.map(option => option.value)

interface SetsSearch {
  q?: string
  sort?: string
  order?: SortOrder
}

export const Route = createFileRoute('/sets/$game/')({
  validateSearch: (search: Record<string, unknown>): SetsSearch => ({
    order: search.order === 'asc' || search.order === 'desc' ? search.order : undefined,
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
    sort: typeof search.sort === 'string' ? search.sort : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps, params }) => {
    const game = await queryClient.ensureQueryData(gameQuery(params.game))
    if (!game) throw notFound()
    await queryClient.ensureQueryData(setsQuery(game.id, {
      order: deps.order,
      q: deps.q,
      sort: pickSort(deps.sort, sortValues, 'releasedAt'),
    }))
    return game
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.name} sets | CardNearMe` : 'Sets | CardNearMe' }] }),
  component: SetsPage,
})

function SetsPage() {
  const game = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const sort = pickSort(search.sort, sortValues, 'releasedAt')
  const order = search.order ?? 'desc'
  const { data: sets } = useSuspenseQuery(setsQuery(game.id, {
    order: search.order,
    q: search.q,
    sort,
  }))
  const [query, setQuery] = useState(search.q ?? '')
  const update = useCallback((next: Partial<SetsSearch>) => void navigate({
    replace: true,
    search: previous => ({
      ...previous,
      ...next,
    }),
  }), [navigate])

  useEffect(() => {
    if (query === (search.q ?? '')) return
    const timeout = setTimeout(() => update({ q: query || undefined }), 250)
    return () => clearTimeout(timeout)
  }, [query, search.q, update])

  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{
          href: '/sets',
          label: 'Sets',
        }, { label: game.name }]}
        description={`Browse and explore all ${game.name} sets and releases`}
        title={game.name}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            aria-label="Search for a set"
            className="pl-9"
            onChange={event => setQuery(event.target.value)}
            placeholder="Search for a set"
            value={query}
          />
        </div>

        <Select
          onValueChange={value => update({ sort: value })}
          value={sort}
        >
          <SelectTrigger
            aria-label="Sort by"
            className="w-44"
          >
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {sortOptions.map(option => (
              <SelectItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          aria-label={order === 'asc' ? 'Ascending' : 'Descending'}
          onClick={() => update({ order: order === 'asc' ? 'desc' : 'asc' })}
          size="icon"
          variant="outline"
        >
          {order === 'asc' ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>

              <TableHead>Code</TableHead>

              <TableHead className="text-right">Cards</TableHead>

              <TableHead className="text-right">Market cap</TableHead>

              <TableHead>Type</TableHead>

              <TableHead>Released</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sets.map(set => (
              <TableRow key={set.code}>
                <TableCell className="font-semibold">
                  <Link
                    className="hover:text-primary"
                    params={{
                      game: game.id,
                      set: set.code,
                    }}
                    to="/sets/$game/$set"
                  >
                    {set.name}
                  </Link>
                </TableCell>

                <TableCell className="font-mono text-xs uppercase">{set.code}</TableCell>

                <TableCell className="text-right tabular-nums">{set.cardCount}</TableCell>

                <TableCell className="text-right">{set.marketCap ? <Price amount={set.marketCap} /> : '—'}</TableCell>

                <TableCell className="capitalize">{set.type}</TableCell>

                <TableCell>{formatDate(set.releasedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
