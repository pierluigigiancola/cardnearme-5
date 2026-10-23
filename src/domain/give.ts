import type { CollectionQuantities } from './collection'

/**
 * What a Trader may give in a Trade (ADR 0002). Each side of a Trade is
 * filled from the giver's Collection. The giver may offer any of their own
 * Collection entries, but their partner may pick only from the giver's Haves,
 * and only the copies marked for trade.
 */

/** Who picks the cards for one side of a Trade: the giver, or the partner on the giver's behalf. */
export type GivePicker = 'giver' | 'partner'

/** How many copies of a Collection entry can go on its owner's side of a Trade, depending on who picks them. */
export function givableQuantity(entry: CollectionQuantities, picker: GivePicker) {
  return picker === 'giver' ? entry.quantity : entry.forTradeQuantity
}

/**
 * The quantity a Trade line may take from a Collection entry: the requested
 * quantity, clamped to what may be given. Throws when the request is not a
 * whole number of copies, or when nothing may be given.
 */
export function giveLineQuantity(entry: CollectionQuantities, picker: GivePicker, requested: number) {
  if (!Number.isInteger(requested) || requested < 1) throw new Error('Quantity must be at least 1')
  const givable = givableQuantity(entry, picker)
  if (givable < 1) throw new Error(picker === 'partner' ? 'This card is not for trade' : 'You no longer own this card')
  return Math.min(requested, givable)
}
