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

/** One printing of a card in a set. */
export interface Card {
  id: string
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

export interface UserProfile {
  id: string
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

/** A card that a user has put on a haves or wants list. */
export interface TradeItem {
  id: string
  listType: TradeListType
  card: Card
  ownerUsername: string
  storeSlugs: string[]
  citySlug: string
  condition: Condition
  finish: Finish
  language: Language
  quantity: number
  price: number
  updatedAt: string
}

export interface DeckCard {
  card: Card
  quantity: number
  section: 'commander' | 'mainboard' | 'sideboard' | 'considering'
}

export interface Deck {
  id: string
  gameId: GameId
  format: string
  name: string
  ownerUsername: string
  description: string
  updatedAt: string
  likes: number
  commentCount: number
  cards: DeckCard[]
}

export interface DeckComment {
  id: string
  username: string
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

export interface CardQuery {
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
  ownerUsername?: string
  listType: TradeListType
  q?: string
  sort?: 'name' | 'price' | 'updated' | 'quantity'
  order?: SortOrder
  facets?: FacetSelection
  /**
   * Paging only: how many results this page should hold. It never raises the
   * viewer's cap. The server works the cap out from the session (anonymous
   * visitors get `ANONYMOUS_RESULT_CAP`), clamps this limit to it and reports
   * `cappedAt` when the cap held results back. Omit it to get every result the
   * viewer may see.
   */
  limit?: number
}

export interface SearchResult {
  cards: Card[]
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

export type BinderSection = TradeListType | 'collection'
export type Visibility = 'public' | 'private'

export interface TradeList {
  id: string
  name: string
  type: TradeListType
  /** Restricts the list to one game; null accepts cards from any game. */
  gameId: GameId | null
  visibility: Visibility
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

/** A card in the viewer's binder: their collection or one of their trade lists. */
export interface BinderItem {
  id: string
  section: BinderSection
  /** Trade list the item belongs to (haves and wants only). */
  listId: string | null
  card: Card
  /** For wants this is the minimum acceptable condition. */
  condition: Condition
  finish: Finish
  language: Language
  quantity: number
  price: number
  /** Offered in a pending or accepted trade. */
  inTrade: boolean
  /** Collection only: the same printing is also on a haves list. */
  listed: boolean
  updatedAt: string
}

export interface BinderItemInput {
  section: BinderSection
  listId?: string | null
  cardId: string
  condition: Condition
  finish: Finish
  language: Language
  quantity: number
}

export type BinderItemPatch = Partial<Pick<BinderItem, 'condition' | 'finish' | 'language' | 'quantity' | 'listId'>>

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
  /** Distinct printings. */
  distinct: number
}

export interface BinderPage {
  items: BinderItem[]
  total: number
  facets: Facet[]
  stats: BinderStats
}

export type BinderCounts = Record<BinderSection, number>

/** How many copies of a card (any printing) the viewer has in each section. */
export type Ownership = Record<BinderSection, number>

/** One line of a CSV or pasted card list, before it is matched to a printing. */
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

export interface ImportRow extends ParsedImportRow {
  card: Card | null
  include: boolean
}

export interface BinderImport {
  id: string
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
    cardId: string
    quantity: number
    section: DeckSection
  }[]
}

export interface ChatParticipant {
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
  author: string
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
  /** Binder item (viewer's side) or trade item (partner's side) this line came from. */
  sourceId: string
  card: Card
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
  proposer: string
  recipient: string
  proposerGives: TradeLine[]
  recipientGives: TradeLine[]
  /** Cash added to balance the values; `cashPayer` hands it over. */
  cashAmount: number
  cashPayer: string | null
  meetup: MeetupLocation | null
  meetAt: string | null
  note: string
  status: TradeStatus
  /** Who has to act next: the side that did not make the latest offer. */
  awaiting: string | null
  cancelledBy: string | null
  createdAt: string
  updatedAt: string
}

/** A trade proposal from the viewer's point of view. */
export interface TradeDraft {
  partner: string
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
  /** Viewer's haves and collection, offerable on the "you give" side. */
  myItems: BinderItem[]
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
  /** Viewer's haves that are on the partner's wants. */
  theyWant: BinderItem[]
}

export interface MatchScope {
  storeSlug?: string
  citySlug?: string
}

export type NotificationKind = 'message' | 'trade' | 'item-available' | 'item-wanted'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  /** In-app path the notification opens. */
  href: string
  actor: string | null
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
