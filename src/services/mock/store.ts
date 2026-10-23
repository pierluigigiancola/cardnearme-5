import type {
  AppNotification,
  BinderImport,
  CardId,
  Printing,
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
  WantFilters,
  WorkspaceProfile,
} from '../types'

import { printings, decks, stores, tradeItems, users } from './data'
import { MOCK_NOW } from './random'

import { isHave, publicOnly, wantFilters } from '#/domain'

/**
 * The one in-memory store behind every mock service. It holds every Trader's
 * data (Binder, Lists, decks, notifications) plus the chats and Trades
 * between them, so the public pages and the signed-in workspace read and
 * write the same records. It runs on the server only (see `rpc.ts`) and lives
 * until the server restarts. The seed data from `data.ts` loads into it as
 * the seeded Traders; a signed-in Trader is seeded on first access (see
 * `workspace/seed.ts`).
 */

interface EntryRecordBase {
  id: string
  quantity: number
  updatedAt: string
}

/** An owned card, recorded once. Copies for trade make it a Have (ADR 0002). */
export interface CollectionRecord extends EntryRecordBase {
  kind: 'collection'
  printingId: string
  condition: Condition
  finish: Finish
  language: Language
  /** Copies marked for trade, 0 to `quantity`. */
  forTradeQuantity: number
  /** The Haves List the entry is on; it is a Have there only while copies are for trade. */
  listId: string
}

/** A Want: a Card, optionally narrowed by filters (ADR 0002). */
export interface WantRecord extends EntryRecordBase {
  kind: 'want'
  cardId: CardId
  filters: WantFilters
  listId: string
}

/** A Binder record: a Collection entry or a Want. There are no separate Have records. */
export type ItemRecord = CollectionRecord | WantRecord

export interface ListRecord {
  id: string
  name: string
  type: TradeListType
  gameId: GameId | null
  visibility: Visibility
  /** One default Haves List and one default Wants List per Trader. */
  isDefault: boolean
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

export const printingsById = new Map(printings.map(card => [card.id, card]))

const printingsByCardId = new Map<CardId, Printing[]>()
for (const printing of printings) printingsByCardId.set(printing.cardId, [...printingsByCardId.get(printing.cardId) ?? [], printing])

/** Every Printing of a Card. */
export function printingsOf(cardId: CardId) {
  return printingsByCardId.get(cardId) ?? []
}

/** The Printing shown for a Want: one in its filtered Set (and finish) when set, else the Card's first. */
export function shownPrinting(want: Pick<WantRecord, 'cardId' | 'filters'>) {
  const { finish, setCode } = want.filters
  const candidates = printingsOf(want.cardId)
    .filter(printing => !setCode || printing.setCode.toLowerCase() === setCode.toLowerCase())
  return candidates.find(printing => !finish || printing.finishes.includes(finish)) ?? candidates.at(0)
}

/** How a Want reads as a Printing's details: its filters, with "any" shown as the shown Printing's finish, English and the worst condition. */
export function wantDetails(want: Pick<WantRecord, 'filters'>, card: Printing) {
  const finish = want.filters.finish ?? card.finishes.at(0) ?? 'nonfoil'
  return {
    condition: want.filters.minCondition ?? 'PO',
    finish,
    language: want.filters.language ?? 'en',
    price: priceOf(card, finish),
  } satisfies {
    condition: Condition
    finish: Finish
    language: Language
    price: number
  }
}
export const storesBySlug = new Map(stores.map(store => [store.slug, store]))

export function priceOf(card: Printing, finish: Finish) {
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
      isDefault: true,
      name: type === 'haves' ? 'Haves' : 'Wants',
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
        .map((item): ItemRecord => {
          const base = {
            id: item.id,
            listId: `${user.id}-${item.listType}`,
            quantity: item.quantity,
            updatedAt: item.updatedAt,
          }
          // A seeded Have is a Collection entry with every copy for trade.
          return item.listType === 'haves'
            ? {
              ...base,
              condition: item.condition,
              finish: item.finish,
              forTradeQuantity: item.quantity,
              kind: 'collection',
              language: item.language,
              printingId: item.card.id,
            }
            : {
              ...base,
              // A seeded Want is for its Card, with a minimum condition and, for foils, the finish.
              cardId: item.card.cardId,
              filters: wantFilters({
                finish: item.finish === 'foil' ? 'foil' : null,
                minCondition: item.condition,
              }),
              kind: 'want',
            }
        }),
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
 * The Haves or Wants other Traders can see, projected from Binder records: a
 * Have is a Collection entry with copies for trade, on a public List of a
 * Trader who has picked a City. Nothing else in the Collection is shown. A
 * Want shows its Card through `shownPrinting`, with its filters.
 */
export function listedItems(store: MockStore, listType: TradeListType, trader?: TraderRecord): TradeItem[] {
  const owners = trader ? [trader] : [...store.traders.values()]
  return owners.flatMap((owner) => {
    const citySlug = owner.profile.citySlug
    if (!citySlug) return []
    const shared = {
      citySlug,
      listType,
      ownerId: owner.id,
      ownerUsername: owner.profile.username,
      storeSlugs: owner.profile.storeSlugs,
    }
    return publicOnly(owner.items, owner.lists).flatMap((record): TradeItem[] => {
      if (listType === 'haves') {
        const card = printingsById.get(record.kind === 'collection' ? record.printingId : '')
        if (record.kind !== 'collection' || !isHave(record) || !card) return []
        return [{
          ...shared,
          card,
          condition: record.condition,
          finish: record.finish,
          id: record.id,
          language: record.language,
          price: priceOf(card, record.finish),
          quantity: record.forTradeQuantity,
          updatedAt: record.updatedAt,
          wantFilters: null,
        }]
      }
      if (record.kind !== 'want' || record.quantity <= 0) return []
      const card = shownPrinting(record)
      if (!card) return []
      return [{
        ...shared,
        ...wantDetails(record, card),
        card,
        id: record.id,
        quantity: record.quantity,
        updatedAt: record.updatedAt,
        wantFilters: record.filters,
      }]
    })
  })
}
