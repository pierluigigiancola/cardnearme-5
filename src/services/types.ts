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
  /** Set when the viewer is capped (e.g. anonymous); total is still the real count. */
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
