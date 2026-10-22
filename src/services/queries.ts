import { queryOptions } from '@tanstack/react-query'

import { getServices } from './services'
import type { CatalogueService } from './services'
import type {
  BinderQuery,
  Card,
  CardQuery,
  GameId,
  ListsQuery,
  MatchScope,
  NotificationQuery,
  TradeItemQuery,
} from './types'

/**
 * React Query options for every read the UI performs. Route loaders call
 * `ensureQueryData(...)` with these and components read them with
 * `useSuspenseQuery(...)`, so SSR and client navigation share one cache.
 */

const staticData = { staleTime: 5 * 60_000 }

export const gamesQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).catalogue.listGames(),
    queryKey: ['games'],
  })

export const gameQuery = (gameId: string) =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).catalogue.getGame(gameId),
    queryKey: ['games', gameId],
  })

export const setsQuery = (gameId: GameId, options: Parameters<CatalogueService['listSets']>[1] = {}) =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).catalogue.listSets(gameId, options),
    queryKey: ['sets', gameId, options],
  })

export const setQuery = (gameId: GameId, setCode: string) =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).catalogue.getSet(gameId, setCode),
    queryKey: ['set', gameId, setCode],
  })

export const cardsQuery = (query: CardQuery) =>
  queryOptions({
    queryFn: async () => (await getServices()).catalogue.listCards(query),
    queryKey: ['cards', query],
  })

export const cardQuery = (gameId: GameId, setCode: string, number: string) =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).catalogue.getCard(gameId, setCode, number),
    queryKey: ['card', gameId, setCode, number],
  })

export const printingsQuery = (card: Card) =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).catalogue.listPrintings(card),
    queryKey: ['printings', card.id],
  })

export const cardAvailabilityQuery = (card: Card) =>
  queryOptions({
    queryFn: async () => (await getServices()).catalogue.getCardAvailability(card),
    queryKey: ['availability', card.id],
  })

export const sealedQuery = (gameId: GameId, setCode: string) =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).catalogue.listSealed(gameId, setCode),
    queryKey: ['sealed', gameId, setCode],
  })

export const cardSearchQuery = (q: string, gameId?: GameId) =>
  queryOptions({
    queryFn: async () => (await getServices()).catalogue.searchCards(q, { gameId }),
    queryKey: ['card-search', q, gameId],
  })

export const globalSearchQuery = (q: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).search(q),
    queryKey: ['search', q],
  })

export const citiesQuery = (q?: string) =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).places.listCities(q),
    queryKey: ['cities', q],
  })

export const cityQuery = (slug: string) =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).places.getCity(slug),
    queryKey: ['city', slug],
  })

export const detectedCityQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).places.detectCity(),
    queryKey: ['detected-city'],
  })

export const storesQuery = (citySlug?: string) =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).places.listStores({ citySlug }),
    queryKey: ['stores', citySlug],
  })

export const storeQuery = (slug: string) =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).places.getStore(slug),
    queryKey: ['store', slug],
  })

export const tradeItemsQuery = (query: TradeItemQuery) =>
  queryOptions({
    queryFn: async () => (await getServices()).trading.listTradeItems(query),
    queryKey: ['trade-items', query],
  })

export const cityTradeStatsQuery = (citySlug: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).trading.getCityTradeStats(citySlug),
    queryKey: ['city-trade-stats', citySlug],
  })

export const decksQuery = (options: {
  gameId?: GameId;
  format?: string;
  ownerUsername?: string;
  limit?: number
} = {}) =>
  queryOptions({
    queryFn: async () => (await getServices()).community.listDecks(options),
    queryKey: ['decks', options],
  })

export const deckQuery = (deckId: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).community.getDeck(deckId),
    queryKey: ['deck', deckId],
  })

export const deckCommentsQuery = (deckId: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).community.listDeckComments(deckId),
    queryKey: ['deck-comments', deckId],
  })

export const userQuery = (username: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).community.getUser(username),
    queryKey: ['user', username],
  })

export const newsQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).content.listNews(),
    queryKey: ['news'],
  })

export const changelogQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).content.listChangelog(),
    queryKey: ['changelog'],
  })

export const faqQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).content.listFaq(),
    queryKey: ['faq'],
  })

export const helpArticlesQuery = () =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).content.listHelpArticles(),
    queryKey: ['help'],
  })

export const helpArticleQuery = (slug: string) =>
  queryOptions({
    ...staticData,
    queryFn: async () => (await getServices()).content.getHelpArticle(slug),
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
    queryFn: async () => (await getServices()).profile.get(),
    queryKey: [...workspaceKey(viewerId), 'profile'],
  })

export const binderCountsQuery = (viewerId: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).binder.getCounts(),
    queryKey: [...workspaceKey(viewerId), 'binder-counts'],
  })

export const binderItemsQuery = (viewerId: string, query: BinderQuery) =>
  queryOptions({
    queryFn: async () => (await getServices()).binder.listItems(query),
    queryKey: [...workspaceKey(viewerId), 'binder', query],
  })

export const ownershipQuery = (viewerId: string, cardIds: string[]) =>
  queryOptions({
    queryFn: async () => (await getServices()).binder.getOwnership(cardIds),
    queryKey: [...workspaceKey(viewerId), 'ownership', cardIds],
  })

export const binderImportQuery = (viewerId: string, importId: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).binder.getImport(importId),
    queryKey: [...workspaceKey(viewerId), 'import', importId],
  })

export const tradeListsQuery = (viewerId: string, query: ListsQuery = {}) =>
  queryOptions({
    queryFn: async () => (await getServices()).lists.list(query),
    queryKey: [...workspaceKey(viewerId), 'lists', query],
  })

export const myDecksQuery = (viewerId: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).deckBuilder.listMine(),
    queryKey: [...workspaceKey(viewerId), 'decks'],
  })

export const myDeckQuery = (viewerId: string, deckId: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).deckBuilder.getMine(deckId),
    queryKey: [...workspaceKey(viewerId), 'decks', deckId],
  })

export const chatsQuery = (viewerId: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).chat.listChats(),
    queryKey: [...workspaceKey(viewerId), 'chats'],
    // Poll so replies from the other trader show up without a reload.
    refetchInterval: 15_000,
  })

export const chatThreadQuery = (viewerId: string, chatId: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).chat.getThread(chatId),
    queryKey: [...workspaceKey(viewerId), 'chats', chatId],
    refetchInterval: 5_000,
  })

export const matchesQuery = (viewerId: string, scope: MatchScope = {}) =>
  queryOptions({
    queryFn: async () => (await getServices()).trades.listMatches(scope),
    queryKey: [...workspaceKey(viewerId), 'matches', scope],
  })

export const tradeContextQuery = (viewerId: string, partner: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).trades.getContext(partner),
    queryKey: [...workspaceKey(viewerId), 'trade-context', partner],
  })

export const notificationsQuery = (viewerId: string, query: NotificationQuery = {}) =>
  queryOptions({
    queryFn: async () => (await getServices()).notifications.list(query),
    queryKey: [...workspaceKey(viewerId), 'notifications', query],
  })

export const unreadCountsQuery = (viewerId: string) =>
  queryOptions({
    queryFn: async () => (await getServices()).notifications.getUnreadCounts(),
    queryKey: [...workspaceKey(viewerId), 'unread'],
    refetchInterval: 30_000,
  })
