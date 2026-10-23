import type { Facet, Page, TradeItem, TradeItemQuery } from '../types'

import { tradeItems } from './data'
import { buildFacets, compare, matchesFacets, matchesText, tradeItemFacets } from './queryHelpers'

import { capResults, resultCapFor } from '#/domain'
import type { CapViewer } from '#/domain'

/**
 * Public Haves and Wants for one viewer. Runs on the server (see
 * `tradingRpc.ts`), which passes the session's viewer, so the cap is decided
 * here and the query's `limit` only pages within it.
 */
export async function listTradeItemsFor(
  viewer: CapViewer,
  { citySlug, facets, limit, listType, order = 'desc', ownerUsername, q, sort = 'updated', storeSlug }: TradeItemQuery,
): Promise<Page<TradeItem> & { facets: Facet[] }> {
  const scoped = tradeItems.filter(item =>
    item.listType === listType
    && (!citySlug || item.citySlug === citySlug)
    && (!storeSlug || item.storeSlugs.includes(storeSlug))
    && (!ownerUsername || item.ownerUsername === ownerUsername))
  const filtered = scoped
    .filter(item => matchesText(item.card.name, q) && matchesFacets(item, tradeItemFacets, facets))
    .sort((a, b) => {
      switch (sort) {
        case 'name': return compare(a.card.name, b.card.name, order)
        case 'price': return compare(a.price, b.price, order)
        case 'quantity': return compare(a.quantity, b.quantity, order)
        case 'updated': return compare(a.updatedAt, b.updatedAt, order)
      }
    })
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
