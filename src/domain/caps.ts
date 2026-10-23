/**
 * Product caps. The server decides them from the session; the UI only reads
 * them to explain a cap, and never sends one.
 */

/** Stores a Trader can join as trading locations. */
export const STORE_JOIN_CAP = 5

/** Results an anonymous visitor sees when browsing a City's or Store's Haves or Wants. */
export const ANONYMOUS_RESULT_CAP = 30

/** The part of a viewer the caps depend on (structurally matches `Viewer`). */
export interface CapViewer { kind: 'anonymous' | 'user' }

/** How many results this viewer may see, or `null` when uncapped. */
export function resultCapFor(viewer: CapViewer): number | null {
  return viewer.kind === 'anonymous' ? ANONYMOUS_RESULT_CAP : null
}

/** True while a Trader who has joined `joinedCount` Stores may join one more. */
export function canJoinAnotherStore(joinedCount: number) {
  return joinedCount < STORE_JOIN_CAP
}

/**
 * Applies the viewer's result cap and the client's paging `limit` to a full,
 * ordered result list. The limit is clamped to the cap, so asking for more
 * can't raise it. `cappedAt` is the cap when it, not the limit, held results
 * back; a limit below the cap is paging and reports `null`.
 */
export function capResults<T>(items: readonly T[], { cap, limit }: {
  cap: number | null
  limit?: number
}): {
  items: T[];
  cappedAt: number | null
} {
  const requested = limit === undefined ? Infinity : Math.max(0, Math.floor(limit))
  const take = Math.min(requested, cap ?? Infinity)
  const cappedAt = cap !== null && requested >= cap && items.length > cap ? cap : null
  return {
    cappedAt,
    items: items.slice(0, take),
  }
}
