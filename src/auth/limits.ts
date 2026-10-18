import type { Viewer } from './viewer'

/**
 * Product limits for anonymous visitors. Tune these here; the UI reads them
 * and the service layer enforces them (`limit` on list queries).
 */
export const viewerLimits = {
  /** Cards shown when an anonymous visitor browses a city's haves or wants. */
  anonymousTradeResults: 30,
}

export function tradeResultLimit(viewer: Viewer): number | undefined {
  return viewer.kind === 'anonymous' ? viewerLimits.anonymousTradeResults : undefined
}

/** Actions that need an account; the copy is shown in the sign-up prompt. */
export const gatedActions = {
  addToCollection: 'add cards to your collection or trade lists',
  comment: 'leave a comment',
  joinStore: 'join a store',
  matches: 'see your matches',
  message: 'message other traders',
  ownership: 'track which cards you own',
  priceHistory: 'see price history',
  trade: 'start a trade',
} as const

export type GatedAction = keyof typeof gatedActions
