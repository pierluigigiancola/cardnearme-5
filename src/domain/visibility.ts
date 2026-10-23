/**
 * Visibility (ADR 0002). It is set on Lists only: every Have and Want belongs
 * to exactly one List, and other Traders see an entry only while that List is
 * public. A private List hides its contents from other Traders, not from its
 * owner, and the owner's own Matches still use every Want.
 */
import type { Visibility } from '#/services/types'

/** The part of a List the visibility rule reads. */
export interface ListVisibility {
  id: string
  visibility: Visibility
}

/** The entries other Traders may see, in their original order: those on the owner's public Lists. */
export function publicOnly<T extends { listId: string }>(entries: readonly T[], ownerLists: readonly ListVisibility[]): T[] {
  const publicIds = new Set(ownerLists.filter(list => list.visibility === 'public').map(list => list.id))
  return entries.filter(entry => publicIds.has(entry.listId))
}
