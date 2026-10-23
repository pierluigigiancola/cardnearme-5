import type { CardId, Condition, Finish, Language, WantFilters } from '#/services/types'

/**
 * The Want-fulfilment rule (ADR 0002). A Want targets a Card, not a Printing.
 * Each filter it sets narrows which received copies count; an unset filter
 * (null) means "any". A received copy fulfils the Want only if it is a
 * Printing of the Card and meets every filter that is set.
 */

/** No filters: any Printing of the Card. */
export const ANY_PRINTING: WantFilters = {
  finish: null,
  language: null,
  minCondition: null,
  setCode: null,
}

/** Fills the filters left out with "any". */
export function wantFilters(filters: Partial<WantFilters> = {}): WantFilters {
  return {
    finish: filters.finish ?? null,
    language: filters.language ?? null,
    minCondition: filters.minCondition ?? null,
    setCode: filters.setCode ?? null,
  }
}

/** True when the Want sets no filter. */
export function isAnyPrinting(filters: WantFilters) {
  return Object.values(filters).every(value => value === null)
}

/** What the rule needs from a Want. */
export interface WantTarget {
  cardId: CardId
  filters: WantFilters
}

/** What the rule needs from a received copy: its Printing's Card and Set, and the copy's details. */
export interface ReceivedCopy {
  cardId: CardId
  setCode: string
  finish: Finish
  language: Language
  condition: Condition
}

/** Conditions from best to worst. */
const conditionOrder: Condition[] = ['M', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO']

/** True when `condition` is at least as good as `minimum` (M is best, PO worst). */
export function meetsCondition(condition: Condition, minimum: Condition) {
  return conditionOrder.indexOf(condition) <= conditionOrder.indexOf(minimum)
}

/** True when a received copy fulfils the Want: same Card, and every filter the Want sets is met. */
export function fulfilsWant(copy: ReceivedCopy, want: WantTarget) {
  const { filters } = want
  return copy.cardId === want.cardId
    && (filters.setCode === null || filters.setCode.toLowerCase() === copy.setCode.toLowerCase())
    && (filters.finish === null || filters.finish === copy.finish)
    && (filters.language === null || filters.language === copy.language)
    && (filters.minCondition === null || meetsCondition(copy.condition, filters.minCondition))
}

/**
 * Applies received copies to a Trader's Wants: each fulfilled Want, in order,
 * takes as many copies as it still wants until the copies run out. Returns
 * the new quantity of every Want it reduced (0 = fulfilled, remove it).
 */
export function fulfilWants(wants: (WantTarget & { id: string, quantity: number })[], copies: ReceivedCopy & { quantity: number }) {
  const reduced: { id: string, quantity: number }[] = []
  let remaining = copies.quantity
  for (const want of wants) {
    if (remaining <= 0) break
    if (want.quantity <= 0 || !fulfilsWant(copies, want)) continue
    const taken = Math.min(remaining, want.quantity)
    remaining -= taken
    reduced.push({
      id: want.id,
      quantity: want.quantity - taken,
    })
  }
  return reduced
}
