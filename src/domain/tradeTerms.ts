import type { TradeDraft, UserId } from '#/services/types'

/**
 * The terms of a proposed or revised Trade: who trades, and the cash that
 * balances it. Card lines follow the give rule (`give.ts`).
 */

/** Checks that the partner is another Trader. */
export function checkTradePartner(me: UserId, partner: UserId) {
  if (me === partner) throw new Error('You cannot trade with yourself')
}

/** Checks that a Trade is between two different Traders and moves at least one card (cash alone is not a Trade). */
export function checkTradeParties(me: UserId, partner: UserId, cards: {
  give: number;
  get: number
}) {
  checkTradePartner(me, partner)
  if (cards.give + cards.get === 0) throw new Error('Add at least one card to the trade')
}

/** The cash of a draft, rounded to cents, and the Trader who pays it (none when there is no cash). */
export function tradeCash(cash: TradeDraft['cash'], me: UserId, partner: UserId) {
  const cashAmount = cash ? Math.round(cash.amount * 100) / 100 : 0
  if (!Number.isFinite(cashAmount) || cashAmount < 0) throw new Error('Cash must be a positive amount')
  return {
    cashAmount,
    cashPayer: cash && cashAmount > 0 ? (cash.payer === 'me' ? me : partner) : null,
  }
}
