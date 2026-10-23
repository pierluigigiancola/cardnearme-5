import type { Trade, UserId } from '../../types'
import { requireTrader } from '../store'
import type { ItemRecord, MockStore } from '../store'

import { now, traderContext } from './context'
import { addRecords, collectionRecords, wantRecords } from './records'

import { acceptTrade, afterGiving, checkReservable, completionChanges, confirmTrade, freeQuantity, fulfilWants, linesGivenBy, reservedQuantities } from '#/domain'
import type { BinderChange } from '#/domain'

/**
 * The store-side steps of the Trade lifecycle (ADR 0003) that touch both
 * Traders: accepting reserves both sides' cards, and the second confirmation
 * applies both Binder changes at once. Shared by the trades service and the
 * development-only mock partners.
 */

/** Accepts `trade` as `by`. Refused when either side gives more copies than they own minus what accepted Trades already reserve. */
export function acceptAs(store: MockStore, trade: Trade, by: UserId) {
  const next = acceptTrade(trade, by)
  for (const giver of [trade.proposer, trade.recipient]) {
    const reserved = reservedQuantities(store.trades, giver)
    const records = requireTrader(store, giver).items
    checkReservable(linesGivenBy(trade, giver), (sourceId) => {
      const record = records.find(candidate => candidate.id === sourceId)
      if (record?.kind !== 'collection') return 0
      return freeQuantity({
        ...record,
        reservedQuantity: reserved.get(sourceId) ?? 0,
      })
    })
  }
  Object.assign(trade, next, { updatedAt: now() })
  return trade
}

/** Records `by`'s confirmation. When it is the second one, the Trade completes and both Binders update in this same step. */
export function confirmAs(store: MockStore, trade: Trade, by: UserId) {
  const at = now()
  Object.assign(trade, confirmTrade(trade, by, at), { updatedAt: at })
  if (trade.status === 'completed') for (const change of completionChanges(trade)) applyBinderChange(store, change)
  return trade
}

/** Given copies leave the giver's Collection (for-trade and reserved copies with them); received copies join it and fulfil the Wants they meet (see `fulfilWants`). */
function applyBinderChange(store: MockStore, { gives, receives, trader: id }: BinderChange) {
  const ctx = traderContext(store, requireTrader(store, id))
  const { trader } = ctx
  const dropEmpty = (record: ItemRecord) => {
    record.updatedAt = now()
    if (record.quantity <= 0) trader.items = trader.items.filter(candidate => candidate !== record)
  }
  for (const line of gives) {
    const source = collectionRecords(ctx).find(record => record.id === line.sourceId)
    if (!source) continue
    Object.assign(source, afterGiving(source, line.quantity))
    dropEmpty(source)
  }
  for (const line of receives) {
    addRecords(ctx, [{
      condition: line.condition,
      finish: line.finish,
      kind: 'collection',
      language: line.language,
      printingId: line.card.id,
      quantity: line.quantity,
    }])
    const wants = wantRecords(ctx)
    const reduced = fulfilWants(wants, {
      cardId: line.card.cardId,
      condition: line.condition,
      finish: line.finish,
      language: line.language,
      quantity: line.quantity,
      setCode: line.card.setCode,
    })
    for (const { id: wantId, quantity } of reduced) {
      const want = wants.find(record => record.id === wantId)
      if (!want) continue
      want.quantity = quantity
      dropEmpty(want)
    }
  }
}
