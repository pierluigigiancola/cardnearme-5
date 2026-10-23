/**
 * Collection entries (ADR 0002). A Trader records each owned card once, as a
 * Collection entry with a quantity and a for-trade quantity. A Have is not a
 * separate record: it is a Collection entry with copies marked for trade.
 */

/** The quantities a Collection entry records. */
export interface CollectionQuantities {
  /** Copies owned. */
  quantity: number
  /** Copies marked for trade, from 0 to `quantity`. */
  forTradeQuantity: number
  /** Copies promised to other Traders in accepted Trades (ADR 0003); 0 when left out. */
  reservedQuantity?: number
}

/** A Collection entry is a Have while at least one of its copies is for trade. */
export function isHave(entry: Pick<CollectionQuantities, 'forTradeQuantity'>) {
  return entry.forTradeQuantity > 0
}

/** Checks a for-trade quantity against the copies owned and returns it. Throws unless it is a whole number from 0 to `quantity`. */
export function checkForTradeQuantity(quantity: number, forTradeQuantity: number) {
  if (!Number.isInteger(forTradeQuantity) || forTradeQuantity < 0) throw new Error('For-trade quantity must be a whole number')
  if (forTradeQuantity > quantity) throw new Error(`You own only ${quantity} ${quantity === 1 ? 'copy' : 'copies'}`)
  return forTradeQuantity
}

/**
 * A Collection entry after its owner gives `given` copies away. The given
 * copies come out of the for-trade ones first and release as many reserved
 * copies, since they were reserved for this give. A `quantity` of 0 means the
 * entry is gone.
 */
export function afterGiving(entry: CollectionQuantities, given: number): CollectionQuantities {
  const quantity = Math.max(0, entry.quantity - given)
  const after: CollectionQuantities = {
    forTradeQuantity: Math.min(quantity, Math.max(0, entry.forTradeQuantity - given)),
    quantity,
  }
  if (entry.reservedQuantity !== undefined) after.reservedQuantity = Math.min(quantity, Math.max(0, entry.reservedQuantity - given))
  return after
}
