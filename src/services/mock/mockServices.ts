
import type { Services } from '../services'

import {
  printings,
  changelog,
  cities,
  faq,
  games,
  helpArticles,
  news,
  sealedProducts,
  sets,
  stores,
} from './data'
import { buildFacets, cardFacets, compare, matchesFacets, matchesText, rarityOrder } from './queryHelpers'
import { resolveImportRows } from './resolveImportRows'
import { mockStoreServices, mockWorkspaceServices } from './rpc'

/** Simulates network latency so loading states are exercised in the shell. */
function delay<T>(value: T, ms = 80): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

// ---------------------------------------------------------------------------
// Implementation. Catalogue, places and content are static and served from
// the bundle; everything that reads Traders' data goes to the shared store on
// the server (`rpc.ts`).
// ---------------------------------------------------------------------------

export const mockServices: Services = {
  ...mockWorkspaceServices,
  catalogue: {
    getCardAvailability: mockStoreServices.catalogue.getCardAvailability,
    getGame: async gameId => delay(games.find(game => game.id === gameId) ?? null),
    getPrinting: async (gameId, setCode, number) =>
      delay(printings.find(card => card.gameId === gameId && card.setCode === setCode && card.number === number) ?? null),
    getSet: async (gameId, setCode) => delay(sets.find(set => set.gameId === gameId && set.code === setCode) ?? null),
    listGames: async () => delay(games),
    listPrintings: async cardId => delay(printings.filter(printing => printing.cardId === cardId)),
    listSealed: async (gameId, setCode) =>
      delay(sealedProducts.filter(product => product.gameId === gameId && product.setCode === setCode)),
    listSetPrintings: async ({ facets, gameId, order = 'asc', q, setCode, sort = 'number' }) => {
      const inSet = printings.filter(card => card.gameId === gameId && card.setCode === setCode)
      const filtered = inSet
        .filter(card => matchesText(card.name, q) && matchesFacets(card, cardFacets, facets))
        .sort((a, b) => {
          switch (sort) {
            case 'name': return compare(a.name, b.name, order)
            case 'price': return compare(a.prices.nonfoil ?? 0, b.prices.nonfoil ?? 0, order)
            case 'priceChange': return compare(a.priceChange7d, b.priceChange7d, order)
            case 'rarity': return compare(rarityOrder.indexOf(a.rarity), rarityOrder.indexOf(b.rarity), order)
            case 'number': return compare(Number(a.number), Number(b.number), order)
          }
        })
      return delay({
        facets: buildFacets(inSet, cardFacets),
        items: filtered,
        total: filtered.length,
      })
    },
    listSets: async (gameId, { order = 'desc', q, sort = 'releasedAt' } = {}) =>
      delay(
        sets
          .filter(set => set.gameId === gameId && (matchesText(set.name, q) || matchesText(set.code, q)))
          .sort((a, b) => compare(a[sort] ?? 0, b[sort] ?? 0, order)),
      ),
    matchCards: async (rows, options) => delay(resolveImportRows(rows, options)),
    searchCards: async (q, { gameId, limit = 8 } = {}) => {
      if (!q.trim()) return delay([])
      const seen = new Set<string>()
      return delay(
        printings
          .filter(card => (!gameId || card.gameId === gameId) && matchesText(card.name, q))
          .filter((card) => {
            const key = card.cardId
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .slice(0, limit),
      )
    },
  },
  community: mockStoreServices.community,
  content: {
    getHelpArticle: async slug => delay(helpArticles.find(article => article.slug === slug) ?? null),
    listChangelog: async () => delay(changelog),
    listFaq: async () => delay(faq),
    listHelpArticles: async () => delay(helpArticles),
    listNews: async () => delay(news),
  },
  places: {
    detectCity: async () => {
      const city = cities.find(c => c.slug === 'vigevano--italy') ?? cities.at(0)
      if (!city) throw new Error('Mock data has no cities')
      return delay(city)
    },
    getCity: async slug => delay(cities.find(city => city.slug === slug) ?? null),
    getStore: async slug => delay(stores.find(store => store.slug === slug) ?? null),
    listCities: async q => delay(cities.filter(city => matchesText(`${city.name} ${city.country}`, q))),
    listStores: async ({ citySlug } = {}) =>
      delay(
        stores
          .filter(store => !citySlug || store.citySlug === citySlug)
          .sort((a, b) => b.traderCount - a.traderCount),
      ),
  },
  search: async (q) => {
    const [matchingCards, matchingCities] = await Promise.all([
      mockServices.catalogue.searchCards(q, { limit: 6 }),
      q.trim() ? mockServices.places.listCities(q) : Promise.resolve([]),
    ])
    return {
      cards: matchingCards,
      cities: matchingCities.slice(0, 4),
    }
  },
  trading: mockStoreServices.trading,
}
