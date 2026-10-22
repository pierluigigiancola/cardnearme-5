import { useSuspenseQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'

import { TradeItems } from './TradeItems'

import { AuthLinks } from '#/auth/AuthGate'
import { viewerLimits } from '#/auth/limits'
import { BrowseToolbar, FacetSidebar } from '#/components/browse/BrowseControls'
import { pickSort } from '#/lib/browseSearch'
import type { BrowseSearch } from '#/lib/browseSearch'
import { tradeItemsQuery } from '#/services/queries'
import type { TradeItemQuery, TradeListType } from '#/services/types'

export const tradeSortOptions = [
  {
    label: 'Recently updated',
    value: 'updated',
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
    label: 'Quantity',
    value: 'quantity',
  },
] as const

const sortValues = tradeSortOptions.map(option => option.value)

/** Builds the trade-items query from URL state; shared by loaders and components. */
export function buildTradeQuery(
  scope: Pick<TradeItemQuery, 'citySlug' | 'storeSlug' | 'ownerUsername'>,
  listType: TradeListType,
  search: BrowseSearch,
  limit: number | undefined,
): TradeItemQuery {
  return {
    ...scope,
    facets: search.f,
    limit,
    listType,
    order: search.order ?? 'desc',
    q: search.q,
    sort: pickSort(search.sort, sortValues, 'updated'),
  }
}

export function TradeBrowser({ aside, onChange, query, search }: {
  query: TradeItemQuery
  search: BrowseSearch
  onChange: (update: (previous: BrowseSearch) => BrowseSearch) => void
  aside?: React.ReactNode
}) {
  const { data } = useSuspenseQuery(tradeItemsQuery(query))

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="space-y-6">
        {aside}

        <FacetSidebar
          facets={data.facets}
          onChange={onChange}
          search={search}
        />
      </div>

      <div className="space-y-4">
        <BrowseToolbar
          onChange={onChange}
          order={query.order ?? 'desc'}
          placeholder="Search for trades"
          search={search}
          shown={data.items.length}
          sort={query.sort ?? 'updated'}
          sortOptions={[...tradeSortOptions]}
          total={data.total}
        />

        <TradeItems
          items={data.items}
          view={search.view ?? 'visual'}
        />

        {data.cappedAt !== null && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center">
            <Lock className="size-5 text-primary" />

            <p className="font-semibold">
              You are seeing
              {' '}

              {viewerLimits.anonymousTradeResults}

              {' of '}

              {data.total}

              {' cards'}
            </p>

            <p className="text-sm text-muted-foreground">Create a free account to browse everything and get matched with traders.</p>

            <AuthLinks size="sm" />
          </div>
        )}
      </div>
    </div>
  )
}
