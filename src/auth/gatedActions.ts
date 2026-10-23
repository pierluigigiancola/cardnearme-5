/** Actions that need an account; the copy is shown in the sign-up prompt. */
export const gatedActions = {
  addToCollection: 'add cards to your collection or trade lists',
  comment: 'leave a comment',
  joinStore: 'join a store',
  like: 'like decks',
  matches: 'see your matches',
  message: 'message other traders',
  ownership: 'track which cards you own',
  priceHistory: 'see price history',
  trade: 'start a trade',
} as const

export type GatedAction = keyof typeof gatedActions
