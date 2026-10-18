
import type { Services } from '../services'
import type { Card, Facet, FacetSelection, SortOrder, TradeItem } from '../types'

import {
  cards,
  changelog,
  cities,
  deckComments,
  decks,
  faq,
  games,
  helpArticles,
  news,
  sealedProducts,
  sets,
  stores,
  tradeItems,
  users,
} from './data'

// ---------------------------------------------------------------------------
// Facet helpers
// ---------------------------------------------------------------------------

interface FacetDefinition<T> {
  key: string
  label: string
  values: (item: T) => string[]
  labelFor?: (value: string) => string
}

function matchesFacets<T>(item: T, definitions: FacetDefinition<T>[], selection: FacetSelection = {}) {
  return definitions.every((definition) => {
    const selected = selection[definition.key]
    if (!selected || selected.length === 0) return true
    return definition.values(item).some(value => selected.includes(value))
  })
}

function buildFacets<T>(items: T[], definitions: FacetDefinition<T>[]): Facet[] {
  return definitions.map((definition) => {
    const counts = new Map<string, number>()
    for (const item of items) {
      for (const value of definition.values(item)) {
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
    }
    return {
      buckets: [...counts.entries()]
        .map(([value, count]) => ({
          count,
          label: definition.labelFor?.(value) ?? value,
          value,
        }))
        .sort((a, b) => b.count - a.count),
      key: definition.key,
      label: definition.label,
    }
  })
}

function compare(a: string | number, b: string | number, order: SortOrder = 'asc') {
  const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
  return order === 'asc' ? result : -result
}

function matchesText(value: string, q?: string) {
  return !q || value.toLowerCase().includes(q.trim().toLowerCase())
}

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const baseType = (card: Card) => card.typeLine.split(' — ')[0] ?? card.typeLine
const rarityOrder = ['common', 'uncommon', 'rare', 'mythic', 'special']
const colorLabels: Record<string, string> = {
  B: 'Black',
  C: 'Colorless',
  G: 'Green',
  R: 'Red',
  U: 'Blue',
  W: 'White',
}
const languageLabels: Record<string, string> = {
  de: 'German',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
  zh: 'Chinese',
}
const conditionLabels: Record<string, string> = {
  EX: 'Excellent',
  GD: 'Good',
  LP: 'Light played',
  M: 'Mint',
  NM: 'Near mint',
  PL: 'Played',
  PO: 'Poor',
}

const cardFacets: FacetDefinition<Card>[] = [
  {
    key: 'rarity',
    label: 'Rarity',
    labelFor: capitalise,
    values: card => [card.rarity],
  },
  {
    key: 'type',
    label: 'Types',
    values: card => [baseType(card)],
  },
  {
    key: 'finish',
    label: 'Finishes',
    labelFor: capitalise,
    values: card => card.finishes,
  },
  {
    key: 'color',
    label: 'Colors',
    labelFor: value => colorLabels[value] ?? value,
    values: card => card.colors,
  },
  {
    key: 'artist',
    label: 'Artist',
    values: card => [card.artist],
  },
]

const tradeItemFacets: FacetDefinition<TradeItem>[] = [
  {
    key: 'game',
    label: 'Games',
    labelFor: value => games.find(game => game.id === value)?.name ?? value,
    values: item => [item.card.gameId],
  },
  {
    key: 'set',
    label: 'Sets',
    labelFor: value => sets.find(set => set.code === value)?.name ?? value,
    values: item => [item.card.setCode],
  },
  {
    key: 'condition',
    label: 'Condition',
    labelFor: value => conditionLabels[value] ?? value,
    values: item => [item.condition],
  },
  {
    key: 'language',
    label: 'Language',
    labelFor: value => languageLabels[value] ?? value,
    values: item => [item.language],
  },
  {
    key: 'finish',
    label: 'Finishes',
    labelFor: capitalise,
    values: item => [item.finish],
  },
  {
    key: 'rarity',
    label: 'Rarity',
    labelFor: capitalise,
    values: item => [item.card.rarity],
  },
]

/** Simulates network latency so loading states are exercised in the shell. */
function delay<T>(value: T, ms = 80): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export const mockServices: Services = {
  catalogue: {
    getCard: async (gameId, setCode, number) =>
      delay(cards.find(card => card.gameId === gameId && card.setCode === setCode && card.number === number) ?? null),
    getCardAvailability: async (card) => {
      const relevant = tradeItems.filter(item => item.card.name === card.name)
      return delay(
        cities
          .map((city) => {
            const inCity = relevant.filter(item => item.citySlug === city.slug)
            return {
              available: inCity.filter(item => item.listType === 'haves').length,
              cityName: city.name,
              citySlug: city.slug,
              country: city.country,
              storeCount: stores.filter(store => store.citySlug === city.slug).length,
              wanted: inCity.filter(item => item.listType === 'wants').length,
            }
          })
          .filter(entry => entry.available + entry.wanted > 0),
      )
    },
    getGame: async gameId => delay(games.find(game => game.id === gameId) ?? null),
    getSet: async (gameId, setCode) => delay(sets.find(set => set.gameId === gameId && set.code === setCode) ?? null),
    listCards: async ({ facets, gameId, order = 'asc', q, setCode, sort = 'number' }) => {
      const inSet = cards.filter(card => card.gameId === gameId && card.setCode === setCode)
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
    listGames: async () => delay(games),
    listPrintings: async card => delay(cards.filter(other => other.name === card.name && other.id !== card.id)),
    listSealed: async (gameId, setCode) =>
      delay(sealedProducts.filter(product => product.gameId === gameId && product.setCode === setCode)),
    listSets: async (gameId, { order = 'desc', q, sort = 'releasedAt' } = {}) =>
      delay(
        sets
          .filter(set => set.gameId === gameId && (matchesText(set.name, q) || matchesText(set.code, q)))
          .sort((a, b) => compare(a[sort] ?? 0, b[sort] ?? 0, order)),
      ),
    searchCards: async (q, { gameId, limit = 8 } = {}) => {
      if (!q.trim()) return delay([])
      const seen = new Set<string>()
      return delay(
        cards
          .filter(card => (!gameId || card.gameId === gameId) && matchesText(card.name, q))
          .filter((card) => {
            const key = `${card.gameId}:${card.name}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .slice(0, limit),
      )
    },
  },
  community: {
    getDeck: async deckId => delay(decks.find(deck => deck.id === deckId) ?? null),
    getUser: async username => delay(users.find(user => user.username === username) ?? null),
    listDeckComments: async deckId => delay(deckComments[deckId] ?? []),
    listDecks: async ({ format, gameId, limit, ownerUsername } = {}) => {
      const result = decks
        .filter(deck =>
          (!gameId || deck.gameId === gameId)
          && (!format || deck.format.toLowerCase() === format.toLowerCase())
          && (!ownerUsername || deck.ownerUsername === ownerUsername))
        .sort((a, b) => compare(a.updatedAt, b.updatedAt, 'desc'))
      return delay(limit ? result.slice(0, limit) : result)
    },
  },
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
  trading: {
    getCityTradeStats: async (citySlug) => {
      const inCity = tradeItems.filter(item => item.citySlug === citySlug)
      return delay({
        haves: inCity.filter(item => item.listType === 'haves').length,
        wants: inCity.filter(item => item.listType === 'wants').length,
      })
    },
    listTradeItems: async ({ citySlug, facets, limit, listType, order = 'desc', ownerUsername, q, sort = 'updated', storeSlug }) => {
      const scoped = tradeItems.filter(item =>
        item.listType === listType
        && (!citySlug || item.citySlug === citySlug)
        && (!storeSlug || item.storeSlugs.includes(storeSlug))
        && (!ownerUsername || item.ownerUsername === ownerUsername))
      const filtered = scoped
        .filter(item => matchesText(item.card.name, q) && matchesFacets(item, tradeItemFacets, facets))
        .sort((a, b) => {
          switch (sort) {
            case 'name': return compare(a.card.name, b.card.name, order)
            case 'price': return compare(a.price, b.price, order)
            case 'quantity': return compare(a.quantity, b.quantity, order)
            case 'updated': return compare(a.updatedAt, b.updatedAt, order)
          }
        })
      return delay({
        cappedAt: limit !== undefined && filtered.length > limit ? limit : null,
        facets: buildFacets(scoped, tradeItemFacets),
        items: limit !== undefined ? filtered.slice(0, limit) : filtered,
        total: filtered.length,
      })
    },
  },
}
