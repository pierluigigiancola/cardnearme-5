import { queryOptions } from '@tanstack/react-query'

import { getServices } from './services'
import type { CatalogueService } from './services'
import type { Card, CardQuery, GameId, TradeItemQuery } from './types'

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
