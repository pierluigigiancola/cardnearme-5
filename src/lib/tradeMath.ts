import type { Trade, TradeLine } from '#/services/types'

/** Value of trade lines at their agreed unit price. */
export function linesValue(lines: Pick<TradeLine, 'price' | 'quantity'>[]) {
  return Math.round(lines.reduce((total, line) => total + line.price * line.quantity, 0) * 100) / 100
}

/** Value of trade lines at the current market price. */
export function linesMarketValue(lines: Pick<TradeLine, 'marketPrice' | 'quantity'>[]) {
  return Math.round(lines.reduce((total, line) => total + line.marketPrice * line.quantity, 0) * 100) / 100
}

/**
 * A trade seen from one participant: what they give and get, and the totals
 * including the cash balance (cash counts towards the side that pays it).
 */
export function tradeFromPerspective(trade: Trade, username: string) {
  const isProposer = trade.proposer === username
  const partner = isProposer ? trade.recipient : trade.proposer
  const give = isProposer ? trade.proposerGives : trade.recipientGives
  const get = isProposer ? trade.recipientGives : trade.proposerGives
  const myCash = trade.cashPayer === username ? trade.cashAmount : 0
  const theirCash = trade.cashPayer === partner ? trade.cashAmount : 0
  const myTotal = linesValue(give) + myCash
  const theirTotal = linesValue(get) + theirCash
  return {
    /** Positive when the viewer gives more value than they get (never -0, which formats as "-€0.00"). */
    difference: Math.round((myTotal - theirTotal) * 100) / 100 || 0,
    get,
    give,
    myCash,
    myTotal,
    partner,
    theirCash,
    theirTotal,
  }
}
