import type { Trade, TradeLine, UserId } from '#/services/types'

function toCents(amount: number) {
  // `|| 0` drops -0, which would format as "-€0.00".
  return Math.round(amount * 100) / 100 || 0
}

/**
 * Trade value: what trade lines are worth at their agreed unit price, rounded
 * to cents. The one rule every caller (Trade views, the Trade builder, the
 * mock services) uses to total the cards in a Trade.
 */
export function tradeValue(lines: readonly Pick<TradeLine, 'price' | 'quantity'>[]) {
  return toCents(lines.reduce((total, line) => total + line.price * line.quantity, 0))
}

/** What trade lines are worth at the current market price, rounded to cents. */
export function marketValue(lines: readonly Pick<TradeLine, 'marketPrice' | 'quantity'>[]) {
  return toCents(lines.reduce((total, line) => total + line.marketPrice * line.quantity, 0))
}

/**
 * A Trade seen from one participant: what they give and get, and the totals
 * including the cash balance (cash counts towards the side that pays it).
 */
export function tradeFromPerspective(trade: Trade, me: UserId) {
  const isProposer = trade.proposer === me
  const partner = isProposer ? trade.recipient : trade.proposer
  const give = isProposer ? trade.proposerGives : trade.recipientGives
  const get = isProposer ? trade.recipientGives : trade.proposerGives
  const myCash = trade.cashPayer === me ? trade.cashAmount : 0
  const theirCash = trade.cashPayer === partner ? trade.cashAmount : 0
  const myTotal = tradeValue(give) + myCash
  const theirTotal = tradeValue(get) + theirCash
  return {
    /** Positive when the viewer gives more value than they get (never -0). */
    difference: toCents(myTotal - theirTotal),
    get,
    give,
    myCash,
    myTotal,
    /** The other Trader's UserId. */
    partner,
    theirCash,
    theirTotal,
  }
}
