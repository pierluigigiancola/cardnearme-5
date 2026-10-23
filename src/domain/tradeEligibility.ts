import type { City, TradeEligibility } from '#/services/types'

/**
 * The trade-eligibility rule (spec decisions 5 and 6). A City unlocks once
 * enough Traders have joined it. Before then its Traders still see their
 * Matches, but no Trade can be proposed by or to them. The City limits who
 * finds whom, not who may trade: Traders in two different unlocked Cities may
 * trade with each other.
 */

/** What the rule reads from a City. */
export type CityUnlock = Pick<City, 'name' | 'traderCount' | 'unlockThreshold'>

export function isCityUnlocked(city: CityUnlock) {
  return city.traderCount >= city.unlockThreshold
}

function lockedReason(city: CityUnlock) {
  return `Trading in ${city.name} unlocks once ${city.unlockThreshold} traders have joined (${city.traderCount} so far).`
}

/**
 * Whether a Trader in `proposerCity` may propose a Trade to a Trader in
 * `partnerCity`: both Traders must have a City, and neither City may be locked.
 */
export function tradeEligibility(proposerCity: CityUnlock | null, partnerCity: CityUnlock | null): TradeEligibility {
  if (!proposerCity) {
    return {
      canPropose: false,
      reason: 'Pick your city before proposing a trade.',
    }
  }
  if (!partnerCity) {
    return {
      canPropose: false,
      reason: 'This trader has not picked a city yet, so trading with them is not open.',
    }
  }
  const locked = [proposerCity, partnerCity].find(city => !isCityUnlocked(city))
  return locked
    ? {
      canPropose: false,
      reason: lockedReason(locked),
    }
    : { canPropose: true }
}

/** Throws the reason when the Trade may not be proposed (see `tradeEligibility`). */
export function checkCanPropose(proposerCity: CityUnlock | null, partnerCity: CityUnlock | null) {
  const eligibility = tradeEligibility(proposerCity, partnerCity)
  if (!eligibility.canPropose) throw new Error(eligibility.reason)
}
