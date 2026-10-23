import { describe, expect, it } from 'vitest'

import { checkCanPropose, isCityUnlocked, tradeEligibility } from './tradeEligibility'

const milan = {
  name: 'Milan',
  traderCount: 268,
  unlockThreshold: 4,
}
const rome = {
  name: 'Rome',
  traderCount: 4,
  unlockThreshold: 4,
}
const vigevano = {
  name: 'Vigevano',
  traderCount: 1,
  unlockThreshold: 3,
}

describe('Trade eligibility', () => {
  it('unlocks a City once its Traders reach the threshold', () => {
    expect(isCityUnlocked(milan)).toBe(true)
    expect(isCityUnlocked(rome)).toBe(true)
    expect(isCityUnlocked(vigevano)).toBe(false)
  })

  it('lets Traders in unlocked Cities propose, including across different Cities', () => {
    expect(tradeEligibility(milan, milan)).toEqual({ canPropose: true })
    expect(tradeEligibility(milan, rome)).toEqual({ canPropose: true })
  })

  it('refuses proposing while the proposer\'s City is locked', () => {
    expect(tradeEligibility(vigevano, milan)).toEqual({
      canPropose: false,
      reason: 'Trading in Vigevano unlocks once 3 traders have joined (1 so far).',
    })
  })

  it('refuses proposing to a Trader whose City is still locked', () => {
    expect(tradeEligibility(milan, vigevano)).toEqual({
      canPropose: false,
      reason: 'Trading in Vigevano unlocks once 3 traders have joined (1 so far).',
    })
  })

  it('refuses proposing before the proposer has picked a City', () => {
    expect(tradeEligibility(null, milan)).toEqual({
      canPropose: false,
      reason: 'Pick your city before proposing a trade.',
    })
  })

  it('refuses proposing to a Trader who has not picked a City', () => {
    expect(tradeEligibility(milan, null)).toEqual({
      canPropose: false,
      reason: 'This trader has not picked a city yet, so trading with them is not open.',
    })
  })

  it('throws the reason when asked to check', () => {
    expect(() => checkCanPropose(vigevano, milan)).toThrow('Trading in Vigevano unlocks once 3 traders have joined (1 so far).')
    expect(() => checkCanPropose(milan, rome)).not.toThrow()
  })
})
