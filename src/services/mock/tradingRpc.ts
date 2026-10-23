import { createServerFn } from '@tanstack/react-start'

import type { TradeItemQuery } from '../types'

import { fetchViewer } from '#/auth/viewer'

/**
 * Server side of `trading.listTradeItems`. Anonymous visitors may call it, so
 * the viewer, and with it the result cap, comes from the session, never from
 * the browser. The query's `limit` is paging only.
 */
export const listTradeItemsRpc = createServerFn({ method: 'POST' })
  .validator((query: TradeItemQuery) => query)
  .handler(async ({ data }) => {
    const viewer = await fetchViewer()
    const { listTradeItemsFor } = await import('./tradeItems')
    return listTradeItemsFor(viewer, data)
  })
