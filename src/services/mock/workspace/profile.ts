import type { ProfileService } from '../../services'
import { cities, games } from '../data'
import { storesBySlug } from '../store'

import { now } from './context'
import type { TraderContext } from './context'

import { canJoinAnotherStore, STORE_JOIN_CAP } from '#/domain'

function requireStore(storeSlug: string) {
  const store = storesBySlug.get(storeSlug)
  if (!store) throw new Error('Store not found')
  return store
}

export function profileService({ trader }: TraderContext): ProfileService {
  const { profile } = trader
  return {
    completeOnboarding: async ({ citySlug, showStoresOnProfile, storeSlugs }) => {
      if (!cities.some(city => city.slug === citySlug)) throw new Error('Pick your city')
      const unique = [...new Set(storeSlugs)]
      if (unique.length > STORE_JOIN_CAP) throw new Error(`Pick up to ${STORE_JOIN_CAP} stores`)
      unique.forEach(requireStore)
      Object.assign(profile, {
        citySlug,
        onboardedAt: profile.onboardedAt ?? now(),
        showStoresOnProfile,
        storeSlugs: unique,
      })
      return profile
    },
    get: async () => profile,
    joinStore: async (storeSlug) => {
      const store = requireStore(storeSlug)
      if (profile.storeSlugs.includes(store.slug)) return profile
      if (!canJoinAnotherStore(profile.storeSlugs.length)) {
        throw new Error(`You can trade at up to ${STORE_JOIN_CAP} stores. Leave one first.`)
      }
      profile.storeSlugs = [...profile.storeSlugs, store.slug]
      profile.citySlug ??= store.citySlug
      return profile
    },
    leaveStore: async (storeSlug) => {
      profile.storeSlugs = profile.storeSlugs.filter(slug => slug !== storeSlug)
      return profile
    },
    update: async (patch) => {
      if (patch.displayName !== undefined) {
        const displayName = patch.displayName.trim().slice(0, 40)
        if (!displayName) throw new Error('Display name cannot be empty')
        profile.displayName = displayName
      }
      if (patch.bio !== undefined) profile.bio = patch.bio.trim().slice(0, 280)
      if (patch.avatarHue !== undefined) profile.avatarHue = Math.min(360, Math.max(0, Math.round(patch.avatarHue)))
      if (patch.citySlug !== undefined) {
        if (patch.citySlug !== null && !cities.some(city => city.slug === patch.citySlug)) throw new Error('City not found')
        profile.citySlug = patch.citySlug
      }
      if (patch.showStoresOnProfile !== undefined) profile.showStoresOnProfile = patch.showStoresOnProfile
      if (patch.games !== undefined) {
        const valid = patch.games.filter(gameId => games.some(game => game.id === gameId))
        if (valid.length === 0) throw new Error('Pick at least one game')
        profile.games = [...new Set(valid)]
      }
      if (patch.pricingSource !== undefined) {
        profile.pricingSource = patch.pricingSource === 'tcgplayer-usd' ? 'tcgplayer-usd' : 'cardmarket-eur'
      }
      if (patch.meetingPlaces !== undefined) {
        profile.meetingPlaces = patch.meetingPlaces.map(place => place.trim().slice(0, 60)).filter(Boolean)
          .slice(0, 5)
      }
      return profile
    },
    updateStoreSettings: async (storeSlug, settings) => {
      if (!profile.storeSlugs.includes(storeSlug)) throw new Error('Join the store first')
      profile.storeSettings = {
        ...profile.storeSettings,
        [storeSlug]: { notifyMatches: settings.notifyMatches },
      }
      return profile
    },
  }
}
