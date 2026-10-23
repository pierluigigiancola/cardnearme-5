import type { Facet, Page, TradeItem, TradeItemQuery } from '../types'

import { buildFacets, cardItemSortKeys, matchesFacets, matchesText, sortBy, tradeItemFacets } from './queryHelpers'
import { listedItems, mockStore } from './store'
import type { MockStore } from './store'

import { capResults, resultCapFor } from '#/domain'
import type { CapViewer } from '#/domain'

/**
 * Public Haves and Wants for one viewer, read from the shared store. Runs on
 * the server (see `rpc.ts`), which passes the session's viewer, so the cap is
 * decided here and the query's `limit` only pages within it.
 */
export async function listTradeItemsFor(
  viewer: CapViewer,
  { citySlug, facets, limit, listType, order = 'desc', ownerId, q, sort = 'updated', storeSlug }: TradeItemQuery,
  store: MockStore = mockStore,
): Promise<Page<TradeItem> & { facets: Facet[] }> {
  const scoped = listedItems(store, listType).filter(item =>
    (!citySlug || item.citySlug === citySlug)
    && (!storeSlug || item.storeSlugs.includes(storeSlug))
    && (!ownerId || item.ownerId === ownerId))
  const filtered = sortBy(scoped.filter(item => matchesText(item.card.name, q) && matchesFacets(item, tradeItemFacets, facets)), cardItemSortKeys, sort, order)
  const page = capResults(filtered, {
    cap: resultCapFor(viewer),
    limit,
  })
  return {
    cappedAt: page.cappedAt,
    facets: buildFacets(scoped, tradeItemFacets),
    items: page.items,
    total: filtered.length,
  }
}
