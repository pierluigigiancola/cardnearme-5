import type { CollectionQuantities } from './collection'
import { otherSide } from './tradeLifecycle'

import type { Trade, TradeLine, UserId } from '#/services/types'

/**
 * Reservation and completion (ADR 0003). Accepting a Trade reserves the
 * cards each side gives: a Collection entry's reserved quantity is what its
 * owner gives in accepted Trades. Pending Trades reserve nothing. When a
 * Trade completes, the reservation ends because the copies leave the giver's
 * Collection.
 */

type TradeSides = Pick<Trade, 'proposer' | 'proposerGives' | 'recipient' | 'recipientGives'>

/** The lines a Trader gives in a Trade. */
export function linesGivenBy(trade: TradeSides, trader: UserId) {
  otherSide(trade, trader)
  return trade.proposer === trader ? trade.proposerGives : trade.recipientGives
}

/** Copies of each of the Trader's Collection entries (by id) reserved by accepted Trades. */
export function reservedQuantities(trades: (TradeSides & Pick<Trade, 'status'>)[], trader: UserId) {
  const reserved = new Map<string, number>()
  for (const trade of trades) {
    if (trade.status !== 'accepted' || (trade.proposer !== trader && trade.recipient !== trader)) continue
    for (const line of linesGivenBy(trade, trader)) reserved.set(line.sourceId, (reserved.get(line.sourceId) ?? 0) + line.quantity)
  }
  return reserved
}

/** Copies of a Collection entry not reserved by an accepted Trade. */
export function freeQuantity(entry: CollectionQuantities) {
  return Math.max(0, entry.quantity - (entry.reservedQuantity ?? 0))
}

/**
 * Checks a new number of copies owned for a Collection entry with `reserved`
 * copies promised in accepted Trades, and returns it. Reserved copies can't
 * leave the Collection outside their Trade: a Trader can't own fewer than are
 * reserved, nor remove the entry (0 copies), until those Trades are cancelled
 * or completed.
 */
export function checkOwnedQuantity(quantity: number, reserved: number) {
  if (quantity < reserved) {
    throw new Error(reserved === 1
      ? '1 copy is reserved by an accepted trade; cancel it first'
      : `${reserved} copies are reserved by accepted trades; cancel them first`)
  }
  return quantity
}

/**
 * Checks that one side of a Trade can be reserved: per Collection entry, its
 * lines need no more than the free copies (`freeOf(sourceId)`, 0 when the
 * entry is gone). Throws, naming the card, when they do.
 */
export function checkReservable(lines: TradeLine[], freeOf: (sourceId: string) => number) {
  const needed = new Map<string, {
    quantity: number;
    line: TradeLine
  }>()
  for (const line of lines) {
    const entry = needed.get(line.sourceId)
    needed.set(line.sourceId, {
      line,
      quantity: (entry?.quantity ?? 0) + line.quantity,
    })
  }
  for (const [sourceId, { line, quantity }] of needed) {
    const free = freeOf(sourceId)
    if (quantity > free) throw new Error(`Only ${free} ${free === 1 ? 'copy' : 'copies'} of ${line.card.name} ${free === 1 ? 'is' : 'are'} owned and not reserved by other trades`)
  }
}

/** One Trader's Binder change when a Trade completes. */
export interface BinderChange {
  trader: UserId
  /** Lines whose copies leave the Trader's Collection (from `sourceId`). */
  gives: TradeLine[]
  /** Lines whose copies join the Trader's Collection. */
  receives: TradeLine[]
}

/** The Binder changes of a completed Trade, for both Traders together: proposer first, then recipient. */
export function completionChanges(trade: TradeSides & Pick<Trade, 'status'>): [BinderChange, BinderChange] {
  if (trade.status !== 'completed') throw new Error('Only completed trades change Binders')
  return [
    {
      gives: trade.proposerGives,
      receives: trade.recipientGives,
      trader: trade.proposer,
    },
    {
      gives: trade.recipientGives,
      receives: trade.proposerGives,
      trader: trade.recipient,
    },
  ]
}
