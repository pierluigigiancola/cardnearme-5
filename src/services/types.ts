/**
 * Domain model for the trading app. These types are the contract between the
 * UI and whatever backs the services (mock data today, real APIs later).
 */

export type GameId =
  | 'mtg'
  | 'riftbound'
  | 'onepiece'
  | 'swu'
  | 'lorcana'
  | 'fusionworld'
  | 'fab'

export type PricingSource = 'cardmarket-eur' | 'tcgplayer-usd'

export interface GameCapabilities {
  catalogue: boolean
  deckBuilder: boolean
  legalities: boolean
  scanner: boolean
  trading: boolean
}

export interface Game {
  id: GameId
  name: string
  shortName: string
  tagline: string
  capabilities: GameCapabilities
  formats: string[]
  /** Hue used for game-coloured accents (OKLCH hue, 0-360). */
  hue: number
}

export type SetType =
  | 'expansion'
  | 'core'
  | 'commander'
  | 'promo'
  | 'masterpiece'
  | 'starter'

export interface CardSet {
  code: string
  gameId: GameId
  name: string
  type: SetType
  releasedAt: string
  cardCount: number
  marketCap: number | null
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic' | 'special'
export type Finish = 'nonfoil' | 'foil' | 'etched'
export type Condition = 'M' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO'
export type Language = 'en' | 'it' | 'de' | 'fr' | 'es' | 'ja' | 'pt' | 'ko' | 'zh'
export type CardColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C'

export interface Ruling {
  date: string
  text: string
}

/** Identifies a Card. Opaque: never parse it, and don't confuse it with a Printing id. */
export type CardId = string

/**
 * A game piece, identified by its name within a Game regardless of where it
 * was printed. It groups that name's Printings across Sets; Wants target it.
 */
export interface Card {
  id: CardId
  gameId: GameId
  name: string
  slug: string
}

/** One release of a Card in a Set, with its own collector number. Collection entries are always a Printing. */
export interface Printing {
  id: string
  /** The Card this is a release of. */
  cardId: CardId
  gameId: GameId
  setCode: string
  setName: string
  slug: string
  number: string
  name: string
  typeLine: string
  text: string
  flavorText: string | null
  artist: string
  rarity: Rarity
  colors: CardColor[]
  cost: number
  finishes: Finish[]
  prices: Partial<Record<Finish, number>>
  priceChange7d: number
  legalities: Record<string, 'legal' | 'not_legal' | 'banned' | 'restricted'>
  rulings: Ruling[]
}

export type SealedCategory =
  | 'Booster Packs'
  | 'Booster Boxes'
  | 'Bundles'
  | 'Prerelease & Draft Kits'
  | 'Cases'

export interface SealedProduct {
  id: string
  gameId: GameId
  setCode: string
  name: string
  category: SealedCategory
  variant: string
  price: number | null
}

export interface City {
  slug: string
  name: string
  country: string
  lat: number
  lng: number
  traderCount: number
  tradeCount: number
  /** Traders needed before city-wide trading unlocks. */
  unlockThreshold: number
}

export interface Store {
  slug: string
  name: string
  citySlug: string
  address: string
  website: string | null
  lat: number
  lng: number
  traderCount: number
  isHub: boolean
}

/**
 * Identifies a Trader: the Supabase auth user id. Every reference from one
 * record to a person uses it, so a Trader can change their username without
 * breaking Trades or chats. Usernames are for display and URLs only.
 */
export type UserId = string

export interface UserProfile {
  id: UserId
  /** Display name and URL segment (`/users/$username`); never a reference. */
  username: string
  avatarHue: number
  memberSince: string
  badges: string[]
  citySlugs: string[]
  storeSlugs: string[]
  games: GameId[]
  meetingPlaces: string[]
  completedTrades: number
}

export type TradeListType = 'haves' | 'wants'

/**
 * A Have or Want as other Traders see it. A read projection, never a record
 * of its own: a Have is a Collection entry with copies for trade (`id` is the
 * entry's id and `quantity` its for-trade quantity).
 */
export interface TradeItem {
  id: string
  listType: TradeListType
  card: Printing
  /** The Trader who listed it. */
  ownerId: UserId
  /** Display only; refer to the owner by `ownerId`. */
  ownerUsername: string
  storeSlugs: string[]
  citySlug: string
  condition: Condition
  finish: Finish
  language: Language
  quantity: number
  price: number
  /**
   * Wants only (null for Haves): the Want's filters. A Want targets a Card;
   * `card` is the Printing shown for it, and `condition`, `finish` and
   * `language` echo the filters (an unset condition reads as the worst, an
   * unset finish as the shown Printing's, an unset language as English).
   */
  wantFilters: WantFilters | null
  updatedAt: string
}

export interface DeckCard {
  card: Printing
  quantity: number
  section: 'commander' | 'mainboard' | 'sideboard' | 'considering'
}

export interface Deck {
  id: string
  gameId: GameId
  format: string
  name: string
  ownerId: UserId
  /** Display only; refer to the owner by `ownerId`. */
  ownerUsername: string
  description: string
  updatedAt: string
  likes: number
  commentCount: number
  cards: DeckCard[]
}

export interface DeckComment {
  id: string
  authorId: UserId
  /** Display only; refer to the author by `authorId`. */
  authorUsername: string
  body: string
  createdAt: string
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  url: string
  author: string
  publishedAt: string
}

export interface ChangelogEntry {
  date: string
  added: string[]
  improved: string[]
  fixed: string[]
}

export interface HelpArticle {
  slug: string
  title: string
  summary: string
  sections: {
    heading: string;
    body: string
  }[]
}

export interface FaqEntry {
  question: string
  answer: string
}

// ---------------------------------------------------------------------------
// Query shapes
// ---------------------------------------------------------------------------

export type SortOrder = 'asc' | 'desc'
export type ViewMode = 'visual' | 'table'

export interface Page<T> {
  items: T[]
  total: number
  /** The cap that held results back (e.g. the anonymous result cap), or null. `total` is still the real count. */
  cappedAt: number | null
}

export interface FacetBucket {
  value: string
  label: string
  count: number
}

export interface Facet {
  key: string
  label: string
  buckets: FacetBucket[]
}

export type FacetSelection = Partial<Record<string, string[]>>

export interface PrintingQuery {
  gameId: GameId
  setCode: string
  q?: string
  sort?: 'name' | 'price' | 'rarity' | 'number' | 'priceChange'
  order?: SortOrder
  facets?: FacetSelection
}

export interface TradeItemQuery {
  citySlug?: string
  storeSlug?: string
  ownerId?: UserId
  listType: TradeListType
  q?: string
  sort?: 'name' | 'price' | 'updated' | 'quantity'
  order?: SortOrder
  facets?: FacetSelection
  /**
   * The requested page size: how many results (from the first) to return.
   * There is no offset or cursor. It is clamped to the viewer's cap, so it
   * never raises it. The server works the cap out from the session (anonymous
   * visitors get `ANONYMOUS_RESULT_CAP`), clamps this limit to it and reports
   * `cappedAt` when the cap held results back. Omit it to get every result the
   * viewer may see.
   */
  limit?: number
}

export interface SearchResult {
  cards: Printing[]
  cities: City[]
}

export interface CardAvailability {
  citySlug: string
  cityName: string
  country: string
  storeCount: number
  available: number
  wanted: number
}

// ---------------------------------------------------------------------------
// Signed-in workspace: binder, lists, decks, chat, trades, notifications, profile.
// Every workspace call acts on behalf of the signed-in viewer ("me"); the
// service resolves who that is from the session, never from an argument.
// ---------------------------------------------------------------------------

/**
 * A tab of the Binder: every Collection entry, the Collection entries marked
 * for trade (Haves), or the Wants. It names a view, not a record type: a
 * Binder holds only Collection entries and Wants (see `BinderItem['kind']`).
 */
export type BinderSection = TradeListType | 'collection'
export type Visibility = 'public' | 'private'

export interface TradeList {
  id: string
  name: string
  type: TradeListType
  /** Restricts the list to one game; null accepts cards from any game. A default List always accepts every game. */
  gameId: GameId | null
  /**
   * The only visibility switch (ADR 0002): a private List hides its contents
   * from other Traders on every public page, never from its owner.
   */
  visibility: Visibility
  /**
   * Every Trader has one default Haves List and one default Wants List. Entries
   * go there when no List is chosen, and a default List cannot be deleted.
   */
  isDefault: boolean
  cardCount: number
  createdAt: string
  updatedAt: string
}

export interface TradeListInput {
  name: string
  type: TradeListType
  gameId: GameId | null
  visibility: Visibility
}

export interface ListsQuery {
  q?: string
  type?: TradeListType
  sort?: 'name' | 'created' | 'updated'
  order?: SortOrder
}

interface BinderEntryBase {
  id: string
  /** Collection entry: the Printing owned. Want: the Printing shown for it (in the filtered Set when one is set). */
  card: Printing
  /** Market unit price of `card`. */
  price: number
  updatedAt: string
}

/**
 * A Printing the viewer owns, recorded once (ADR 0002). Marking copies for
 * trade makes it a Have, which other Traders see as a `TradeItem`.
 */
export interface CollectionEntry extends BinderEntryBase {
  kind: 'collection'
  condition: Condition
  finish: Finish
  language: Language
  /** Copies owned. */
  quantity: number
  /** Copies marked for trade, from 0 to `quantity`. Above zero, the entry is a Have. */
  forTradeQuantity: number
  /**
   * The Haves List the entry is on. Only its for-trade copies show there (and,
   * while the List is public, to other Traders); with none for trade the entry
   * stays on the List but is not a Have.
   */
  listId: string
  /** Copies promised to other Traders in accepted Trades (ADR 0003), from 0 to `quantity`. They cannot go on another Trade. */
  reservedQuantity: number
}

/**
 * Optional narrowing of a Want (ADR 0002). `null` means "any": a Want with no
 * filters accepts any Printing of its Card, and every filter that is set is
 * binding (see `fulfilsWant` in `#/domain`).
 */
export interface WantFilters {
  setCode: string | null
  finish: Finish | null
  language: Language | null
  /** The worst acceptable condition. */
  minCondition: Condition | null
}

/** A Card the viewer is looking for, on one of their Wants Lists. It targets the Card, not a Printing. */
export interface WantEntry extends BinderEntryBase {
  kind: 'want'
  /** The Card wanted. `card` is only the Printing shown for it. */
  cardId: CardId
  filters: WantFilters
  /** Copies wanted. */
  quantity: number
  /** The Wants List it is on. */
  listId: string
}

/** A record in the viewer's Binder: a Collection entry or a Want. */
export type BinderItem = CollectionEntry | WantEntry

export type BinderItemKind = BinderItem['kind']

/** Adds a Collection entry: a concrete Printing with its details. */
export interface CollectionEntryInput {
  kind: 'collection'
  /** The Haves List for its for-trade copies. Omit for the default List. */
  listId?: string | null
  condition: Condition
  finish: Finish
  language: Language
  printingId: string
  quantity: number
  /** Copies to mark for trade, from 0 (the default) to `quantity`. */
  forTradeQuantity?: number
}

/** Adds a Want for a Card. Filters left out mean "any printing". */
export interface WantInput {
  kind: 'want'
  /** Its Wants List. Omit for the default List. */
  listId?: string | null
  cardId: CardId
  filters?: Partial<WantFilters>
  quantity: number
}

export type BinderItemInput = CollectionEntryInput | WantInput

export interface BinderItemPatch {
  /** Collection entries only. */
  condition?: Condition
  /** Collection entries only. */
  finish?: Finish
  /** Collection entries only. */
  language?: Language
  /** Copies owned or wanted. A Collection entry can't own fewer than its reserved copies. */
  quantity?: number
  /** Collection entries only: copies marked for trade, at most `quantity`. Zero keeps the entry on its Haves List but not as a Have. */
  forTradeQuantity?: number
  /** Wants only: replaces the filters given (`null` sets one back to "any"). */
  filters?: Partial<WantFilters>
  /** Moves the entry to another List of its kind. */
  listId?: string
}

export interface BinderQuery {
  section: BinderSection
  listId?: string
  q?: string
  sort?: 'name' | 'updated' | 'price' | 'quantity'
  order?: SortOrder
  facets?: FacetSelection
}

export interface BinderStats {
  marketValue: number
  /** Total copies, counting quantities. */
  cards: number
  /** Distinct Printings. */
  distinct: number
}

export interface BinderPage {
  items: BinderItem[]
  total: number
  facets: Facet[]
  stats: BinderStats
}

export type BinderCounts = Record<BinderSection, number>

/** How many copies of a Card (any Printing) the viewer has in each Binder tab: owned, for trade, wanted. */
export type Ownership = Record<BinderSection, number>

/** One line of a CSV or pasted card list, before it is matched to a Printing. */
export interface ParsedImportRow {
  line: number
  raw: string
  quantity: number
  name: string
  setCode: string | null
  number: string | null
  finish: Finish
  condition: Condition | null
  language: Language | null
}

/** What `catalogue.matchCards` needs from one line of an imported list. */
export interface CardMatchRow {
  name: string
  setCode: string | null
  number: string | null
}

export interface ImportRow extends ParsedImportRow {
  card: Printing | null
  include: boolean
}

export interface BinderImport {
  id: string
  /** Every import creates Collection entries or Wants; `haves` marks each imported copy for trade. */
  section: BinderSection
  listId: string | null
  source: 'csv' | 'text'
  rows: ImportRow[]
  createdAt: string
  committedAt: string | null
  importedCount: number
}

export interface BinderImportInput {
  section: BinderSection
  listId: string | null
  source: 'csv' | 'text'
  rows: ParsedImportRow[]
}

export type DeckSection = DeckCard['section']

/** A deck owned by the viewer (public decks also appear in the community pages). */
export interface OwnedDeck extends Deck { visibility: Visibility }

export interface DeckInput {
  name: string
  gameId: GameId
  format: string
  description: string
  visibility: Visibility
  cards: {
    printingId: string
    quantity: number
    section: DeckSection
  }[]
}

export interface ChatParticipant {
  id: UserId
  /** Display only. */
  username: string
  avatarHue: number
  online: boolean
  lastSeenAt: string
  /** Stores the participant trades at. */
  storeSlugs: string[]
}

interface ChatMessageBase {
  id: string
  chatId: string
  author: UserId
  sentAt: string
}

export type ChatMessage =
  | (ChatMessageBase & {
    kind: 'text'
    body: string
  })
  | (ChatMessageBase & {
    kind: 'trade'
    tradeId: string
  })
  /** Status changes ("accepted the trade"), rendered as a centred note. */
  | (ChatMessageBase & {
    kind: 'event'
    body: string
  })

export interface ChatSummary {
  id: string
  partner: ChatParticipant
  lastMessage: ChatMessage | null
  unread: number
  /** Status of the most recent trade in the conversation. */
  tradeStatus: TradeStatus | null
  updatedAt: string
}

export interface ChatThread {
  chat: ChatSummary
  messages: ChatMessage[]
  /** Trades referenced by trade messages, keyed by id. */
  trades: Record<string, Trade>
}

export type TradeStatus = 'pending' | 'accepted' | 'completed' | 'cancelled'

export interface TradeLine {
  id: string
  /** The Collection entry this line comes from, on either side (a partner's `TradeItem.id` is their Collection entry's id). */
  sourceId: string
  card: Printing
  condition: Condition
  finish: Finish
  language: Language
  quantity: number
  /** Agreed unit value. */
  price: number
  /** Current market unit price. */
  marketPrice: number
}

export type MeetupLocation =
  | {
    kind: 'store'
    storeSlug: string
    name: string
    address: string
  }
  | {
    kind: 'custom'
    name: string
    address: string
  }

export interface Trade {
  id: string
  chatId: string
  proposer: UserId
  recipient: UserId
  proposerGives: TradeLine[]
  recipientGives: TradeLine[]
  /** Cash added to balance the values; `cashPayer` hands it over. */
  cashAmount: number
  cashPayer: UserId | null
  meetup: MeetupLocation | null
  meetAt: string | null
  note: string
  status: TradeStatus
  /** Who has to act next: the side that did not make the latest offer. */
  awaiting: UserId | null
  cancelledBy: UserId | null
  /**
   * When each Trader confirmed the accepted Trade took place, keyed by UserId.
   * The Trade becomes Completed when both have (ADR 0003).
   */
  confirmedAt: Partial<Record<UserId, string>>
  createdAt: string
  updatedAt: string
}

/** A trade proposal from the viewer's point of view. */
export interface TradeDraft {
  partner: UserId
  give: TradeDraftLine[]
  get: TradeDraftLine[]
  cash: {
    payer: 'me' | 'partner'
    amount: number
  } | null
  meetup: MeetupLocation | null
  meetAt: string | null
  note: string
}

export interface TradeDraftLine {
  sourceId: string
  quantity: number
  price: number
}

/** Everything the trade builder needs to propose a trade to one partner. */
export interface TradeContext {
  partner: ChatParticipant
  /** The viewer's whole Collection: any entry can go on the "you give" side (see `#/domain` give rule). */
  myItems: CollectionEntry[]
  /** The partner's Haves, the only cards that can go on the "you get" side. */
  partnerHaves: TradeItem[]
  partnerWants: TradeItem[]
  /** Stores both traders have joined, suggested as meetup locations. */
  sharedStores: Store[]
  meetingPlaces: string[]
  /** Pre-selection from matches: my items they want, their haves I want. */
  suggestedGive: string[]
  suggestedGet: string[]
}

export interface TradeMatch {
  partner: ChatParticipant
  citySlug: string
  sharedStoreSlugs: string[]
  /** Partner haves that are on the viewer's wants. */
  theyHave: TradeItem[]
  /** Viewer's Haves that are on the partner's wants. */
  theyWant: CollectionEntry[]
  /** Whether the viewer may propose a Trade to this partner yet (a locked City still shows its Matches). */
  eligibility: TradeEligibility
}

/**
 * Where Matches are looked for (spec decision 4). Matching is scoped to the
 * viewer's own City, read from the session; a Store only narrows that City to
 * the Traders who joined it.
 */
export interface MatchScope {
  /**
   * The City the page shows. Matches are found only when it is the viewer's
   * own City (or it is left out); any other City gives no Matches.
   */
  citySlug?: string
  /** Optional filter: only Traders who joined this Store (in the City). */
  storeSlug?: string
}

/**
 * Whether the viewer may propose a Trade (spec decisions 5 and 6). Proposing
 * waits until the City has unlocked; Traders in different Cities may trade.
 */
export type TradeEligibility
  = | { canPropose: true }
    | {
      canPropose: false
      /** Why proposing is refused, for the UI. */
      reason: string
    }

export type NotificationKind = 'message' | 'trade' | 'item-available' | 'item-wanted'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  /** In-app path the notification opens. */
  href: string
  /** The Trader the notification is about. */
  actor: UserId | null
  createdAt: string
  readAt: string | null
}

export interface NotificationQuery {
  kind?: NotificationKind
  status?: 'unread' | 'read'
}

export interface NotificationPage {
  items: AppNotification[]
  counts: {
    total: number
    unread: number
    byKind: Record<NotificationKind, number>
  }
}

export interface UnreadCounts {
  messages: number
  notifications: number
}

export interface StoreSettings {
  /** Notify when someone at this store lists a card on the viewer's wants. */
  notifyMatches: boolean
}

export interface WorkspaceProfile {
  username: string
  displayName: string
  bio: string
  avatarHue: number
  citySlug: string | null
  /** Joined stores ("trading locations"); capped by `STORE_JOIN_CAP` in `#/domain`. */
  storeSlugs: string[]
  showStoresOnProfile: boolean
  storeSettings: Record<string, StoreSettings>
  games: GameId[]
  pricingSource: PricingSource
  /** Custom meetup places offered in the trade builder. */
  meetingPlaces: string[]
  onboardedAt: string | null
}

export type ProfilePatch = Partial<Pick<WorkspaceProfile, 'displayName' | 'bio' | 'avatarHue' | 'citySlug' | 'showStoresOnProfile' | 'games' | 'pricingSource' | 'meetingPlaces'>>

export interface OnboardingInput {
  citySlug: string
  storeSlugs: string[]
  showStoresOnProfile: boolean
}
