import type { CatalogueService, CommunityService, TradingService } from '../services'
import type { Deck, OwnedDeck, UserProfile } from '../types'

import { cities, deckComments, stores } from './data'
import { compare } from './queryHelpers'
import { listedItems, mockStore, traderByUsername } from './store'
import type { MockStore, TraderRecord } from './store'
import { listTradeItemsFor } from './tradeItems'

import type { CapViewer } from '#/domain'

/**
 * The public services that read Traders' data. They run on the server
 * against the shared store (see `rpc.ts`), so a change made in a Trader's
 * workspace shows on the public pages on the next read.
 */
export interface StorePublicServices {
  trading: TradingService
  community: CommunityService
  catalogue: Pick<CatalogueService, 'getCardAvailability'>
}

function toUserProfile(store: MockStore, trader: TraderRecord): UserProfile {
  const { profile } = trader
  const completedHere = store.trades.filter(trade =>
    trade.status === 'completed' && (trade.proposer === profile.username || trade.recipient === profile.username)).length
  return {
    avatarHue: profile.avatarHue,
    badges: trader.badges,
    citySlugs: profile.citySlug ? [profile.citySlug] : [],
    completedTrades: trader.pastCompletedTrades + completedHere,
    games: profile.games,
    id: trader.id,
    meetingPlaces: profile.meetingPlaces,
    memberSince: trader.memberSince,
    storeSlugs: profile.showStoresOnProfile ? profile.storeSlugs : [],
    username: profile.username,
  }
}

function toDeck({ visibility: _visibility, ...deck }: OwnedDeck): Deck {
  return deck
}

function publicDecks(store: MockStore) {
  return [...store.traders.values()].flatMap(trader => trader.decks.filter(deck => deck.visibility === 'public').map(toDeck))
}

/** `viewer` comes from the session; it decides the anonymous result cap. */
export function publicServices(store: MockStore = mockStore, viewer: CapViewer = { kind: 'anonymous' }): StorePublicServices {
  return {
    catalogue: {
      getCardAvailability: async (card) => {
        const relevant = [...listedItems(store, 'haves'), ...listedItems(store, 'wants')].filter(item => item.card.name === card.name)
        return cities
          .map((city) => {
            const inCity = relevant.filter(item => item.citySlug === city.slug)
            return {
              available: inCity.filter(item => item.listType === 'haves').length,
              cityName: city.name,
              citySlug: city.slug,
              country: city.country,
              storeCount: stores.filter(candidate => candidate.citySlug === city.slug).length,
              wanted: inCity.filter(item => item.listType === 'wants').length,
            }
          })
          .filter(entry => entry.available + entry.wanted > 0)
      },
    },
    community: {
      getDeck: async deckId => publicDecks(store).find(deck => deck.id === deckId) ?? null,
      getUser: async (username) => {
        const trader = traderByUsername(store, username)
        return trader ? toUserProfile(store, trader) : null
      },
      listDeckComments: async deckId => deckComments[deckId] ?? [],
      listDecks: async ({ format, gameId, limit, ownerUsername } = {}) => {
        const result = publicDecks(store)
          .filter(deck =>
            (!gameId || deck.gameId === gameId)
            && (!format || deck.format.toLowerCase() === format.toLowerCase())
            && (!ownerUsername || deck.ownerUsername === ownerUsername))
          .sort((a, b) => compare(a.updatedAt, b.updatedAt, 'desc'))
        return limit ? result.slice(0, limit) : result
      },
    },
    trading: {
      getCityTradeStats: async citySlug => ({
        haves: listedItems(store, 'haves').filter(item => item.citySlug === citySlug).length,
        wants: listedItems(store, 'wants').filter(item => item.citySlug === citySlug).length,
      }),
      listTradeItems: async query => listTradeItemsFor(viewer, query, store),
    },
  }
}
