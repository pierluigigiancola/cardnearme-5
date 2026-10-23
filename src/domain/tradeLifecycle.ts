import type { Trade, UserId } from '#/services/types'

/**
 * The Trade lifecycle (ADR 0003). A Trade is proposed, may be countered back
 * and forth, is accepted by the side it awaits, and completes only when both
 * Traders have confirmed it took place. Nothing here completes a Trade on its
 * own. Either Trader may cancel until both have confirmed.
 *
 * Each function takes the Trade's current lifecycle fields and returns the
 * next ones, or throws when the step is not allowed.
 */
export type TradeLifecycle = Pick<Trade, 'awaiting' | 'cancelledBy' | 'confirmedAt' | 'proposer' | 'recipient' | 'status'>

/** The other side of a Trade. Throws for someone outside it. */
export function otherSide(trade: Pick<Trade, 'proposer' | 'recipient'>, me: UserId) {
  if (trade.proposer === me) return trade.recipient
  if (trade.recipient === me) return trade.proposer
  throw new Error('Trade not found')
}

/** A new proposal: pending, awaiting the recipient. */
export function proposeTrade(proposer: UserId, recipient: UserId): TradeLifecycle {
  if (proposer === recipient) throw new Error('You cannot trade with yourself')
  return {
    awaiting: recipient,
    cancelledBy: null,
    confirmedAt: {},
    proposer,
    recipient,
    status: 'pending',
  }
}

/**
 * New terms for a pending Trade, from either side: a counter-offer from the
 * awaited side, or an edit by the proposer. Whoever sent them becomes the
 * proposer, and `awaiting` is the side that didn't make this latest offer.
 */
export function counterOffer(trade: TradeLifecycle, by: UserId): TradeLifecycle {
  const other = otherSide(trade, by)
  if (trade.status !== 'pending') throw new Error('Only pending trades can be changed')
  return {
    ...trade,
    awaiting: other,
    proposer: by,
    recipient: other,
  }
}

/** Accepts a pending Trade. Only the awaited side may. Reserving the cards is the caller's job (see `reservation.ts`). */
export function acceptTrade(trade: TradeLifecycle, by: UserId): TradeLifecycle {
  otherSide(trade, by)
  if (trade.status !== 'pending' || trade.awaiting !== by) throw new Error('This trade is not waiting for you')
  return {
    ...trade,
    awaiting: null,
    status: 'accepted',
  }
}

/** True once a Trader has confirmed the Trade took place. */
export function hasConfirmed(trade: Pick<Trade, 'confirmedAt'>, trader: UserId) {
  return Boolean(trade.confirmedAt[trader])
}

/**
 * Records that `by` confirms the accepted Trade took place, at `at`. The
 * second confirmation completes it; the caller then applies both Traders'
 * Binder changes in that same step (`completionChanges`).
 */
export function confirmTrade(trade: TradeLifecycle, by: UserId, at: string): TradeLifecycle {
  const other = otherSide(trade, by)
  if (trade.status !== 'accepted') throw new Error('Only accepted trades can be confirmed')
  if (hasConfirmed(trade, by)) throw new Error('You already confirmed this trade')
  return {
    ...trade,
    confirmedAt: {
      ...trade.confirmedAt,
      [by]: at,
    },
    status: hasConfirmed(trade, other) ? 'completed' : 'accepted',
  }
}

/** Cancels a pending or accepted Trade: a decline, a withdrawal, or calling it off before both have confirmed. */
export function cancelTrade(trade: TradeLifecycle, by: UserId): TradeLifecycle {
  otherSide(trade, by)
  if (trade.status !== 'pending' && trade.status !== 'accepted') throw new Error('This trade is already closed')
  return {
    ...trade,
    awaiting: null,
    cancelledBy: by,
    status: 'cancelled',
  }
}
