import type {
  AppNotification,
  BinderImport,
  BinderSection,
  Card,
  ChatMessage,
  ChatParticipant,
  Condition,
  Finish,
  GameId,
  Language,
  OwnedDeck,
  Trade,
  TradeItem,
  TradeListType,
  UserId,
  Visibility,
  WorkspaceProfile,
} from '../types'

import { cards, decks, stores, tradeItems, users } from './data'
import { MOCK_NOW } from './random'

/**
 * The one in-memory store behind every mock service. It holds every Trader's
 * data (Binder, Lists, decks, notifications) plus the chats and Trades
 * between them, so the public pages and the signed-in workspace read and
 * write the same records. It runs on the server only (see `rpc.ts`) and lives
 * until the server restarts. The seed data from `data.ts` loads into it as
 * the seeded Traders; a signed-in Trader is seeded on first access (see
 * `workspace/seed.ts`).
 */

export interface ItemRecord {
  id: string
  section: BinderSection
  listId: string | null
  cardId: string
  condition: Condition
  finish: Finish
  language: Language
  quantity: number
  updatedAt: string
}

export interface ListRecord {
  id: string
  name: string
  type: TradeListType
  gameId: GameId | null
  visibility: Visibility
  createdAt: string
  updatedAt: string
}

/** A conversation between two Traders, shared by both. */
export interface ChatRecord {
  id: string
  traders: [UserId, UserId]
  messages: ChatMessage[]
  /** When each Trader last read the conversation. */
  lastReadAt: Record<UserId, string>
}

export interface TraderRecord {
  id: UserId
  profile: WorkspaceProfile
  memberSince: string
  badges: string[]
  /** Completed Trades from before the store existed (seed data). */
  pastCompletedTrades: number
  lists: ListRecord[]
  items: ItemRecord[]
  imports: BinderImport[]
  decks: OwnedDeck[]
  notifications: AppNotification[]
}

export interface MockStore {
  /** Every Trader, keyed by UserId. */
  traders: Map<UserId, TraderRecord>
  chats: ChatRecord[]
  trades: Trade[]
  nextId: number
}

export const cardsById = new Map(cards.map(card => [card.id, card]))
export const storesBySlug = new Map(stores.map(store => [store.slug, store]))

export function priceOf(card: Card, finish: Finish) {
  return card.prices[finish] ?? card.prices.nonfoil ?? 0
}

/** A fresh store holding the seeded Traders. */
export function createStore(): MockStore {
  const store: MockStore = {
    chats: [],
    // Seeded records use their own ids (`user-3-haves-1`, `deck-4`), so generated ids start above them.
    nextId: 1000,
    traders: new Map(),
    trades: [],
  }
  for (const user of users) {
    const lists: ListRecord[] = (['haves', 'wants'] as const).map(type => ({
      createdAt: user.memberSince,
      gameId: null,
      id: `${user.id}-${type}`,
      name: type === 'haves' ? 'Trade binder' : 'Wishlist',
      type,
      updatedAt: user.memberSince,
      visibility: 'public',
    }))
    store.traders.set(user.id, {
      badges: user.badges,
      decks: decks
        .filter(deck => deck.ownerId === user.id)
        .map(deck => ({
          ...deck,
          visibility: 'public',
        })),
      id: user.id,
      imports: [],
      items: tradeItems
        .filter(item => item.ownerId === user.id)
        .map(item => ({
          cardId: item.card.id,
          condition: item.condition,
          finish: item.finish,
          id: item.id,
          language: item.language,
          listId: `${user.id}-${item.listType}`,
          quantity: item.quantity,
          section: item.listType,
          updatedAt: item.updatedAt,
        })),
      lists,
      memberSince: user.memberSince,
      notifications: [],
      pastCompletedTrades: user.completedTrades,
      profile: {
        avatarHue: user.avatarHue,
        bio: '',
        citySlug: user.citySlugs.at(0) ?? null,
        displayName: user.username,
        games: user.games,
        meetingPlaces: user.meetingPlaces,
        onboardedAt: user.memberSince,
        pricingSource: 'cardmarket-eur',
        showStoresOnProfile: true,
        storeSettings: {},
        storeSlugs: user.storeSlugs,
        username: user.username,
      },
    })
  }
  return store
}

/** The store the running mock uses. */
export const mockStore = createStore()

export function nextId(store: MockStore, prefix: string) {
  return `${prefix}-${store.nextId++}`
}

/**
 * Looks a Trader up by username, for routes that take one in the URL
 * (`/users/$username`). Everything past that boundary uses the UserId.
 */
export function traderByUsername(store: MockStore, username: string) {
  for (const trader of store.traders.values()) {
    if (trader.profile.username === username) return trader
  }
  return undefined
}

export function requireTrader(store: MockStore, id: UserId) {
  const trader = store.traders.get(id)
  if (!trader) throw new Error('Trader not found')
  return trader
}

/** A Trader's current username, for display. */
export function usernameOf(store: MockStore, id: UserId) {
  return requireTrader(store, id).profile.username
}

export function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** How a Trader appears in chats, Matches and the trade builder. */
export function participant(store: MockStore, id: UserId): ChatParticipant {
  const trader = requireTrader(store, id)
  const hash = hashString(id)
  return {
    avatarHue: trader.profile.avatarHue,
    id,
    lastSeenAt: new Date(MOCK_NOW - (hash % 30) * 3_600_000).toISOString(),
    online: hash % 3 === 0,
    storeSlugs: trader.profile.storeSlugs,
    username: trader.profile.username,
  }
}

/**
 * The Haves or Wants other Traders can see: entries on a public List of a
 * Trader who has picked a City.
 */
export function listedItems(store: MockStore, listType: TradeListType, trader?: TraderRecord): TradeItem[] {
  const owners = trader ? [trader] : [...store.traders.values()]
  return owners.flatMap((owner) => {
    const citySlug = owner.profile.citySlug
    if (!citySlug) return []
    const publicLists = new Set(owner.lists.filter(list => list.visibility === 'public').map(list => list.id))
    return owner.items.flatMap((record) => {
      const card = cardsById.get(record.cardId)
      if (record.section !== listType || !record.listId || !publicLists.has(record.listId) || !card) return []
      return [{
        card,
        citySlug,
        condition: record.condition,
        finish: record.finish,
        id: record.id,
        language: record.language,
        listType,
        ownerId: owner.id,
        ownerUsername: owner.profile.username,
        price: priceOf(card, record.finish),
        quantity: record.quantity,
        storeSlugs: owner.profile.storeSlugs,
        updatedAt: record.updatedAt,
      }]
    })
  })
}
