import type {
  BinderCounts,
  BinderImport,
  BinderImportInput,
  BinderItem,
  BinderItemInput,
  BinderItemPatch,
  BinderPage,
  BinderQuery,
  Printing,
  CardMatchRow,
  CardAvailability,
  CardId,
  PrintingQuery,
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
  UserId,
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
  /** The Printings in one Set. */
  listSetPrintings: (query: PrintingQuery) => Promise<{
    items: Printing[];
    total: number;
    facets: Facet[]
  }>
  /** One Printing, by Set code and collector number. */
  getPrinting: (gameId: GameId, setCode: string, number: string) => Promise<Printing | null>
  /** Every Printing of a Card, across Sets. */
  listPrintings: (cardId: CardId) => Promise<Printing[]>
  listSealed: (gameId: GameId, setCode: string) => Promise<SealedProduct[]>
  /** Cards whose name matches, one representative Printing each. */
  searchCards: (q: string, options?: {
    gameId?: GameId;
    limit?: number
  }) => Promise<Printing[]>
  /**
   * Resolves a whole imported list to Printings in one call: one Printing (or null when nothing fits) per row, in row order.
   * The name is fixed by ticket 12; it resolves rows to Printings and has nothing to do with a glossary Match between Traders.
   * A row resolves by Set code and collector number first, then by name (within its Set when given).
   * `gameId` limits matching to one Game; `preferGames` breaks ties between Games for name-only rows.
   */
  matchCards: (rows: CardMatchRow[], options?: {
    gameId?: GameId;
    preferGames?: GameId[]
  }) => Promise<(Printing | null)[]>
  /** Where a Card (any Printing) is offered or wanted on public Lists, per City. */
  getCardAvailability: (cardId: CardId) => Promise<CardAvailability[]>
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
    ownerId?: UserId;
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
  /** Copies per Binder tab: owned, marked for trade, wanted. */
  getCounts: () => Promise<BinderCounts>
  /** One tab of the Binder. `haves` lists the Collection entries with copies for trade; each owned card appears once. */
  listItems: (query: BinderQuery) => Promise<BinderPage>
  /** Copies owned, for trade and wanted of each Printing's Card (counting every Printing), keyed by the Printing id asked for. */
  getOwnership: (printingIds: string[]) => Promise<Partial<Record<string, Ownership>>>
  /** Adds Collection entries or Wants, merging into an identical entry of the same kind. */
  addItems: (items: BinderItemInput[]) => Promise<BinderItem[]>
  /**
   * Edits an entry; for a Collection entry this includes its quantity and for-trade quantity (≤ quantity).
   * Copies owned can't go below the copies reserved by accepted Trades (ADR 0003).
   */
  updateItem: (itemId: string, patch: BinderItemPatch) => Promise<BinderItem>
  /**
   * Multi-select "Move to…": puts entries on another List of their kind. A
   * Collection entry moved to a Haves List becomes a Have (all copies for
   * trade, unless some already are); `listId: null` takes Collection entries
   * off trade. Wants move between Wants Lists only.
   */
  moveItems: (itemIds: string[], target: { listId: string | null }) => Promise<void>
  /** Deletes entries. Refused, for the whole selection, if any Collection entry has copies reserved by an accepted Trade. */
  removeItems: (itemIds: string[]) => Promise<void>
  createImport: (input: BinderImportInput) => Promise<BinderImport>
  getImport: (importId: string) => Promise<BinderImport | null>
  updateImportRow: (importId: string, line: number, patch: {
    include?: boolean
    printingId?: string;
  }) => Promise<BinderImport>
  commitImport: (importId: string) => Promise<BinderImport>
}

export interface ListsService {
  list: (query?: ListsQuery) => Promise<TradeList[]>
  create: (input: TradeListInput) => Promise<TradeList>
  update: (listId: string, patch: Partial<TradeListInput>) => Promise<TradeList>
  /**
   * Deletes a List that is not a default List. Wants on it go with it. Haves
   * on a Haves List go too, but the cards stay owned: their Collection entries
   * come off trade and move to the default Haves List (ADR 0002).
   */
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
  openChat: (partner: UserId) => Promise<ChatSummary>
  sendMessage: (chatId: string, body: string) => Promise<void>
  markRead: (chatId: string) => Promise<void>
}

export interface TradesService {
  /**
   * The viewer's Matches with other Traders in the viewer's own City, read from
   * the session (spec decisions 4 and 6). None if the viewer has no City, or if
   * the scope names a City other than theirs. A Match is another Trader's Have
   * on a public List that fulfils one of the viewer's Wants (filters included,
   * private Lists too), or a Have of the viewer's that fulfils one of the other
   * Trader's public Wants. A Store in the scope only narrows the City to its
   * Traders; shared Stores rank the rest first. Matches are listed whether or
   * not the City has unlocked; each one says whether a Trade may be proposed.
   */
  listMatches: (scope?: MatchScope) => Promise<TradeMatch[]>
  /**
   * What the trade builder needs for one partner: the viewer's whole Collection
   * (any card may be given) and only the partner's Haves on public Lists (ADR 0002),
   * each with its reserved copies, plus suggestions from Matching.
   */
  getContext: (partner: UserId) => Promise<TradeContext>
  /**
   * Posts a proposal into the chat with the partner; returns the new trade.
   * Refused unless the Trade is eligible (`#/domain` `tradeEligibility`): the
   * both Traders must have picked a City, and neither Trader's City may still
   * be locked. Traders in different unlocked Cities may trade.
   */
  propose: (draft: TradeDraft) => Promise<Trade>
  /**
   * Counter-offer or edit: replaces the terms and hands the turn to the other
   * side. Its terms are proposed afresh, so the same eligibility rule as
   * `propose` applies. (Accepting is not checked: spec decision 5 locks only
   * proposing, and ADR 0003 adds only the reservation check.)
   */
  revise: (tradeId: string, draft: TradeDraft) => Promise<Trade>
  /** Accepts the proposal awaiting the viewer and reserves both sides' cards; refused when either side lacks unreserved copies. */
  accept: (tradeId: string) => Promise<Trade>
  /**
   * Confirms the accepted Trade took place, for the viewer's side only (ADR 0003).
   * The first confirmation changes no Binder. The second, from the other Trader,
   * completes the Trade and updates both Binders in that one step.
   */
  confirm: (tradeId: string) => Promise<Trade>
  /** Withdraw (proposer) or decline (recipient) a proposal, or call off an accepted Trade until both have confirmed. */
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
  /** Joins a Store (its City becomes the Trader's if they have none); refused beyond `#/domain` `STORE_JOIN_CAP` joined Stores. */
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
