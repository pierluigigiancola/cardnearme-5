import { queryOptions } from '@tanstack/react-query'

import { getServices } from './services'
import type { CatalogueService, Services } from './services'
import type {
  BinderQuery,
  CardId,
  CardMatchRow,
  PrintingQuery,
  GameId,
  ListsQuery,
  MatchScope,
  NotificationQuery,
  TradeItemQuery,
  UserId,
} from './types'

/**
 * React Query options for every read the UI performs. Route loaders call
 * `ensureQueryData(...)` with these and components read them with
 * `useSuspenseQuery(...)`, so SSR and client navigation share one cache.
 */

const staticData = { staleTime: 5 * 60_000 }

/** Builds a `queryFn` that runs one read against the active services. */
const fromServices = <T>(read: (services: Services) => Promise<T>) => async () => read(await getServices())

export const gamesQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.catalogue.listGames()),
    queryKey: ['games'],
  })

export const gameQuery = (gameId: string) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.catalogue.getGame(gameId)),
    queryKey: ['games', gameId],
  })

export const setsQuery = (gameId: GameId, options: Parameters<CatalogueService['listSets']>[1] = {}) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.catalogue.listSets(gameId, options)),
    queryKey: ['sets', gameId, options],
  })

export const setQuery = (gameId: GameId, setCode: string) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.catalogue.getSet(gameId, setCode)),
    queryKey: ['set', gameId, setCode],
  })

export const setPrintingsQuery = (query: PrintingQuery) =>
  queryOptions({
    queryFn: fromServices(services => services.catalogue.listSetPrintings(query)),
    queryKey: ['cards', query],
  })

export const printingQuery = (gameId: GameId, setCode: string, number: string) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.catalogue.getPrinting(gameId, setCode, number)),
    queryKey: ['card', gameId, setCode, number],
  })

export const printingsQuery = (cardId: CardId) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.catalogue.listPrintings(cardId)),
    queryKey: ['printings', cardId],
  })

export const cardAvailabilityQuery = (cardId: CardId) =>
  queryOptions({
    queryFn: fromServices(services => services.catalogue.getCardAvailability(cardId)),
    queryKey: ['availability', cardId],
  })

export const sealedQuery = (gameId: GameId, setCode: string) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.catalogue.listSealed(gameId, setCode)),
    queryKey: ['sealed', gameId, setCode],
  })

export const cardSearchQuery = (q: string, gameId?: GameId) =>
  queryOptions({
    queryFn: fromServices(services => services.catalogue.searchCards(q, { gameId })),
    queryKey: ['card-search', q, gameId],
  })

/** Resolves an imported card list in one call (`catalogue.matchCards`). Use with `queryClient.fetchQuery`. */
export const cardMatchesQuery = (rows: CardMatchRow[], options: Parameters<CatalogueService['matchCards']>[1] = {}) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.catalogue.matchCards(rows, options)),
    queryKey: ['card-matches', rows, options],
  })

export const globalSearchQuery = (q: string) =>
  queryOptions({
    queryFn: fromServices(services => services.search(q)),
    queryKey: ['search', q],
  })

export const citiesQuery = (q?: string) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.places.listCities(q)),
    queryKey: ['cities', q],
  })

export const cityQuery = (slug: string) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.places.getCity(slug)),
    queryKey: ['city', slug],
  })

export const detectedCityQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.places.detectCity()),
    queryKey: ['detected-city'],
  })

export const storesQuery = (citySlug?: string) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.places.listStores({ citySlug })),
    queryKey: ['stores', citySlug],
  })

export const storeQuery = (slug: string) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.places.getStore(slug)),
    queryKey: ['store', slug],
  })

export const tradeItemsQuery = (query: TradeItemQuery) =>
  queryOptions({
    queryFn: fromServices(services => services.trading.listTradeItems(query)),
    queryKey: ['trade-items', query],
  })

export const cityTradeStatsQuery = (citySlug: string) =>
  queryOptions({
    queryFn: fromServices(services => services.trading.getCityTradeStats(citySlug)),
    queryKey: ['city-trade-stats', citySlug],
  })

export const decksQuery = (options: {
  gameId?: GameId;
  format?: string;
  ownerId?: UserId;
  limit?: number
} = {}) =>
  queryOptions({
    queryFn: fromServices(services => services.community.listDecks(options)),
    queryKey: ['decks', options],
  })

export const deckQuery = (deckId: string) =>
  queryOptions({
    queryFn: fromServices(services => services.community.getDeck(deckId)),
    queryKey: ['deck', deckId],
  })

export const deckCommentsQuery = (deckId: string) =>
  queryOptions({
    queryFn: fromServices(services => services.community.listDeckComments(deckId)),
    queryKey: ['deck-comments', deckId],
  })

export const userQuery = (username: string) =>
  queryOptions({
    queryFn: fromServices(services => services.community.getUser(username)),
    queryKey: ['user', username],
  })

export const newsQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.content.listNews()),
    queryKey: ['news'],
  })

export const changelogQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.content.listChangelog()),
    queryKey: ['changelog'],
  })

export const faqQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.content.listFaq()),
    queryKey: ['faq'],
  })

export const helpArticlesQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.content.listHelpArticles()),
    queryKey: ['help'],
  })

export const helpArticleQuery = (slug: string) =>
  queryOptions({
    ...staticData,
    queryFn: fromServices(services => services.content.getHelpArticle(slug)),
    queryKey: ['help', slug],
  })

// ---------------------------------------------------------------------------
// Signed-in workspace. Keys start with `workspaceKey(viewerId)` so one
// account's data is never served to another after switching accounts, and
// mutations can refresh everything personal with a single invalidation.
// ---------------------------------------------------------------------------

export const workspaceKey = (viewerId: string) => ['me', viewerId] as const

export const profileQuery = (viewerId: string) =>
  queryOptions({
    queryFn: fromServices(services => services.profile.get()),
    queryKey: [...workspaceKey(viewerId), 'profile'],
  })

export const binderCountsQuery = (viewerId: string) =>
  queryOptions({
    queryFn: fromServices(services => services.binder.getCounts()),
    queryKey: [...workspaceKey(viewerId), 'binder-counts'],
  })

export const binderItemsQuery = (viewerId: string, query: BinderQuery) =>
  queryOptions({
    queryFn: fromServices(services => services.binder.listItems(query)),
    queryKey: [...workspaceKey(viewerId), 'binder', query],
  })

export const ownershipQuery = (viewerId: string, cardIds: string[]) =>
  queryOptions({
    queryFn: fromServices(services => services.binder.getOwnership(cardIds)),
    queryKey: [...workspaceKey(viewerId), 'ownership', cardIds],
  })

export const binderImportQuery = (viewerId: string, importId: string) =>
  queryOptions({
    queryFn: fromServices(services => services.binder.getImport(importId)),
    queryKey: [...workspaceKey(viewerId), 'import', importId],
  })

export const tradeListsQuery = (viewerId: string, query: ListsQuery = {}) =>
  queryOptions({
    queryFn: fromServices(services => services.lists.list(query)),
    queryKey: [...workspaceKey(viewerId), 'lists', query],
  })

export const myDecksQuery = (viewerId: string) =>
  queryOptions({
    queryFn: fromServices(services => services.deckBuilder.listMine()),
    queryKey: [...workspaceKey(viewerId), 'decks'],
  })

export const myDeckQuery = (viewerId: string, deckId: string) =>
  queryOptions({
    queryFn: fromServices(services => services.deckBuilder.getMine(deckId)),
    queryKey: [...workspaceKey(viewerId), 'decks', deckId],
  })

export const chatsQuery = (viewerId: string) =>
  queryOptions({
    queryFn: fromServices(services => services.chat.listChats()),
    queryKey: [...workspaceKey(viewerId), 'chats'],
    // Poll so replies from the other trader show up without a reload.
    refetchInterval: 15_000,
  })

export const chatThreadQuery = (viewerId: string, chatId: string) =>
  queryOptions({
    queryFn: fromServices(services => services.chat.getThread(chatId)),
    queryKey: [...workspaceKey(viewerId), 'chats', chatId],
    refetchInterval: 5_000,
  })

export const matchesQuery = (viewerId: string, scope: MatchScope) =>
  queryOptions({
    queryFn: fromServices(services => services.trades.listMatches(scope)),
    queryKey: [...workspaceKey(viewerId), 'matches', scope],
  })

export const tradeContextQuery = (viewerId: string, partner: UserId) =>
  queryOptions({
    queryFn: fromServices(services => services.trades.getContext(partner)),
    queryKey: [...workspaceKey(viewerId), 'trade-context', partner],
  })

export const notificationsQuery = (viewerId: string, query: NotificationQuery = {}) =>
  queryOptions({
    queryFn: fromServices(services => services.notifications.list(query)),
    queryKey: [...workspaceKey(viewerId), 'notifications', query],
  })

export const unreadCountsQuery = (viewerId: string) =>
  queryOptions({
    queryFn: fromServices(services => services.notifications.getUnreadCounts()),
    queryKey: [...workspaceKey(viewerId), 'unread'],
    refetchInterval: 30_000,
  })
