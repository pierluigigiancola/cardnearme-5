import type { Printing, ChatMessage, TradeDraftLine } from '../../types'
import { printingsById, nextId } from '../store'
import type { MockStore, TraderRecord } from '../store'

/**
 * What every workspace service closes over: the shared store and the Trader
 * the session belongs to. Services read and write the store directly, so a
 * change made here is what the public services read next.
 */
export interface TraderContext {
  store: MockStore
  trader: TraderRecord
  /** The Trader's username, as Trades and chats refer to them. */
  me: string
  id: (prefix: string) => string
}

export function traderContext(store: MockStore, trader: TraderRecord): TraderContext {
  return {
    id: prefix => nextId(store, prefix),
    me: trader.profile.username,
    store,
    trader,
  }
}

export const MAX_QUANTITY = 999

/** `Omit` that keeps union members apart (plain `Omit` collapses a union to its shared keys). */
type DistributiveOmit<T, TKey extends PropertyKey> = T extends unknown ? Omit<T, TKey> : never

export type NewMessage = DistributiveOmit<ChatMessage, 'chatId' | 'id' | 'sentAt'>

export function now() {
  return new Date().toISOString()
}

export function requirePrinting(cardId: string) {
  const card = printingsById.get(cardId)
  if (!card) throw new Error('Card not found')
  return card
}

/** Printings of the same Card share this key. */
export function cardKey(printing: Pick<Printing, 'cardId'>) {
  return printing.cardId
}

export function clampQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be at least 1')
  return Math.min(quantity, MAX_QUANTITY)
}

export function validPrice(line: TradeDraftLine, fallback: number) {
  return Number.isFinite(line.price) && line.price >= 0 ? Math.round(line.price * 100) / 100 : fallback
}
