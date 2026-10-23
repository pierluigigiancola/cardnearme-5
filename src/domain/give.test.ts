import { describe, expect, it } from 'vitest'

import { givableQuantity, giveLineQuantity } from './give'

const notForTrade = {
  forTradeQuantity: 0,
  quantity: 3,
}
const oneForTrade = {
  forTradeQuantity: 1,
  quantity: 3,
}

describe('givableQuantity', () => {
  it('lets a Trader offer every copy they own, for trade or not', () => {
    expect(givableQuantity(notForTrade, 'giver')).toBe(3)
    expect(givableQuantity(oneForTrade, 'giver')).toBe(3)
  })

  it('lets the partner pick only the copies marked for trade', () => {
    expect(givableQuantity(oneForTrade, 'partner')).toBe(1)
    expect(givableQuantity(notForTrade, 'partner')).toBe(0)
  })
})

describe('giveLineQuantity', () => {
  it('keeps a request within what may be given', () => {
    expect(giveLineQuantity(oneForTrade, 'giver', 2)).toBe(2)
    expect(giveLineQuantity(oneForTrade, 'partner', 1)).toBe(1)
  })

  it('clamps a request to what may be given', () => {
    expect(giveLineQuantity(oneForTrade, 'giver', 5)).toBe(3)
    expect(giveLineQuantity(oneForTrade, 'partner', 2)).toBe(1)
  })

  it('refuses a partner pick from a Collection entry that is not a Have', () => {
    expect(() => giveLineQuantity(notForTrade, 'partner', 1)).toThrow('not for trade')
  })

  it('refuses a request below one copy', () => {
    expect(() => giveLineQuantity(oneForTrade, 'giver', 0)).toThrow()
    expect(() => giveLineQuantity(oneForTrade, 'giver', 1.5)).toThrow()
  })
})
