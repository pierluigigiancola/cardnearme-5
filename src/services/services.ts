import type {
  BinderCounts,
  BinderImport,
  BinderImportInput,
  BinderItem,
  BinderItemInput,
  BinderItemPatch,
  BinderPage,
  BinderQuery,
  Card,
  CardAvailability,
  CardQuery,
  CardSet,
  ChangelogEntry,
  ChatSummary,
  ChatThread,
  City,
  Deck,
  DeckComment,
  DeckInput,
  Facet,
  FaqEntry,
  Game,
  GameId,
  HelpArticle,
  ListsQuery,
  MatchScope,
  NewsItem,
  NotificationPage,
  NotificationQuery,
  OnboardingInput,
  OwnedDeck,
  Ownership,
  Page,
  ProfilePatch,
  SealedProduct,
  SearchResult,
  SortOrder,
  Store,
  StoreSettings,
  Trade,
  TradeContext,
  TradeDraft,
  TradeItem,
  TradeItemQuery,
  TradeList,
  TradeListInput,
  TradeMatch,
  UnreadCounts,
  UserProfile,
  WorkspaceProfile,
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
  /** Public Haves or Wants. The result cap comes from the caller's session; see `TradeItemQuery.limit`. */
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

// ---------------------------------------------------------------------------
// Signed-in workspace. Implementations act for the session's user and must
// reject anonymous callers themselves (route guards do not protect data).
// ---------------------------------------------------------------------------

export interface BinderService {
  getCounts: () => Promise<BinderCounts>
  listItems: (query: BinderQuery) => Promise<BinderPage>
  /** Copies owned per section, matched by card name across printings. */
  getOwnership: (cardIds: string[]) => Promise<Partial<Record<string, Ownership>>>
  addItems: (items: BinderItemInput[]) => Promise<BinderItem[]>
  updateItem: (itemId: string, patch: BinderItemPatch) => Promise<BinderItem>
  /** Moves items to another section and/or list (multi-select "Move to…"). */
  moveItems: (itemIds: string[], target: {
    section: BinderItem['section'];
    listId: string | null
  }) => Promise<void>
  removeItems: (itemIds: string[]) => Promise<void>
  createImport: (input: BinderImportInput) => Promise<BinderImport>
  getImport: (importId: string) => Promise<BinderImport | null>
  updateImportRow: (importId: string, line: number, patch: {
    cardId?: string;
    include?: boolean
  }) => Promise<BinderImport>
  commitImport: (importId: string) => Promise<BinderImport>
}

export interface ListsService {
  list: (query?: ListsQuery) => Promise<TradeList[]>
  create: (input: TradeListInput) => Promise<TradeList>
  update: (listId: string, patch: Partial<TradeListInput>) => Promise<TradeList>
  /** Deletes the list and the cards on it. */
  remove: (listId: string) => Promise<void>
}

export interface DeckBuilderService {
  listMine: () => Promise<OwnedDeck[]>
  getMine: (deckId: string) => Promise<OwnedDeck | null>
  create: (input: DeckInput) => Promise<OwnedDeck>
  update: (deckId: string, input: DeckInput) => Promise<OwnedDeck>
  remove: (deckId: string) => Promise<void>
}

export interface ChatService {
  listChats: () => Promise<ChatSummary[]>
  getThread: (chatId: string) => Promise<ChatThread | null>
  /** Returns the conversation with a trader, starting one if needed. */
  openChat: (partner: string) => Promise<ChatSummary>
  sendMessage: (chatId: string, body: string) => Promise<void>
  markRead: (chatId: string) => Promise<void>
}

export interface TradesService {
  listMatches: (scope?: MatchScope) => Promise<TradeMatch[]>
  getContext: (partner: string) => Promise<TradeContext>
  /** Posts a proposal into the chat with the partner; returns the new trade. */
  propose: (draft: TradeDraft) => Promise<Trade>
  /** Counter-offer or edit: replaces the terms and hands the turn to the other side. */
  revise: (tradeId: string, draft: TradeDraft) => Promise<Trade>
  accept: (tradeId: string) => Promise<Trade>
  /** Moves the cards between both binders and closes the trade. */
  complete: (tradeId: string) => Promise<Trade>
  /** Withdraw (proposer) or decline (recipient). */
  cancel: (tradeId: string) => Promise<Trade>
}

export interface NotificationsService {
  list: (query?: NotificationQuery) => Promise<NotificationPage>
  getUnreadCounts: () => Promise<UnreadCounts>
  markRead: (notificationIds: string[]) => Promise<void>
  markAllRead: () => Promise<void>
}

export interface ProfileService {
  get: () => Promise<WorkspaceProfile>
  update: (patch: ProfilePatch) => Promise<WorkspaceProfile>
  /**
   * Saves the Trader's City and Stores and records onboarding by setting
   * `profile.onboardedAt` (once). This is the only place onboarding is
   * recorded: the `/x` guard reads `onboardedAt`, nothing else.
   */
  completeOnboarding: (input: OnboardingInput) => Promise<WorkspaceProfile>
  joinStore: (storeSlug: string) => Promise<WorkspaceProfile>
  leaveStore: (storeSlug: string) => Promise<WorkspaceProfile>
  updateStoreSettings: (storeSlug: string, settings: StoreSettings) => Promise<WorkspaceProfile>
}

export interface WorkspaceServices {
  binder: BinderService
  lists: ListsService
  deckBuilder: DeckBuilderService
  chat: ChatService
  trades: TradesService
  notifications: NotificationsService
  profile: ProfileService
}

export interface Services extends WorkspaceServices {
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
