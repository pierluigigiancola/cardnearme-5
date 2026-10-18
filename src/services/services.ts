import type {
  Card,
  CardAvailability,
  CardQuery,
  CardSet,
  ChangelogEntry,
  City,
  Deck,
  DeckComment,
  Facet,
  FaqEntry,
  Game,
  GameId,
  HelpArticle,
  NewsItem,
  Page,
  SealedProduct,
  SearchResult,
  SortOrder,
  Store,
  TradeItem,
  TradeItemQuery,
  UserProfile,
} from './types'

/**
 * The seam between UI and data. Pages only ever reach data through these
 * interfaces (via `queries.ts`), so swapping the mock for real services is a
 * matter of providing another implementation to `setServices`.
 */
export interface CatalogueService {
  listGames: () => Promise<Game[]>
  getGame: (gameId: string) => Promise<Game | null>
  listSets: (gameId: GameId, options?: {
    q?: string;
    sort?: 'name' | 'code' | 'releasedAt' | 'cardCount' | 'marketCap';
    order?: SortOrder
  }) => Promise<CardSet[]>
  getSet: (gameId: GameId, setCode: string) => Promise<CardSet | null>
  listCards: (query: CardQuery) => Promise<{
    items: Card[];
    total: number;
    facets: Facet[]
  }>
  getCard: (gameId: GameId, setCode: string, number: string) => Promise<Card | null>
  listPrintings: (card: Card) => Promise<Card[]>
  listSealed: (gameId: GameId, setCode: string) => Promise<SealedProduct[]>
  searchCards: (q: string, options?: {
    gameId?: GameId;
    limit?: number
  }) => Promise<Card[]>
  getCardAvailability: (card: Card) => Promise<CardAvailability[]>
}

export interface PlacesService {
  listCities: (q?: string) => Promise<City[]>
  getCity: (slug: string) => Promise<City | null>
  /** Best guess at the visitor's city (geo-IP in production). */
  detectCity: () => Promise<City>
  listStores: (options?: { citySlug?: string }) => Promise<Store[]>
  getStore: (slug: string) => Promise<Store | null>
}

export interface TradingService {
  listTradeItems: (query: TradeItemQuery) => Promise<Page<TradeItem> & { facets: Facet[] }>
  getCityTradeStats: (citySlug: string) => Promise<{
    haves: number;
    wants: number
  }>
}

export interface CommunityService {
  listDecks: (options?: {
    gameId?: GameId;
    format?: string;
    ownerUsername?: string;
    limit?: number
  }) => Promise<Deck[]>
  getDeck: (deckId: string) => Promise<Deck | null>
  listDeckComments: (deckId: string) => Promise<DeckComment[]>
  getUser: (username: string) => Promise<UserProfile | null>
}

export interface ContentService {
  listNews: () => Promise<NewsItem[]>
  listChangelog: () => Promise<ChangelogEntry[]>
  listFaq: () => Promise<FaqEntry[]>
  listHelpArticles: () => Promise<HelpArticle[]>
  getHelpArticle: (slug: string) => Promise<HelpArticle | null>
}

export interface Services {
  catalogue: CatalogueService
  places: PlacesService
  trading: TradingService
  community: CommunityService
  content: ContentService
  search: (q: string) => Promise<SearchResult>
}

let current: Services | null = null

export function setServices(services: Services) {
  current = services
}

export async function getServices(): Promise<Services> {
  if (!current) {
    const { mockServices } = await import('./mock/mockServices')
    current = mockServices
  }
  return current
}
