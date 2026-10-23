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

describe('giving reserved copies', () => {
  const twoReserved = {
    forTradeQuantity: 3,
    quantity: 3,
    reservedQuantity: 2,
  }

  it('leaves copies reserved by accepted Trades out of what may be given', () => {
    expect(givableQuantity(twoReserved, 'giver')).toBe(1)
    expect(givableQuantity(twoReserved, 'partner')).toBe(1)
    expect(giveLineQuantity(twoReserved, 'giver', 3)).toBe(1)
  })

  it('refuses a line when every copy is reserved', () => {
    const allReserved = {
      ...twoReserved,
      reservedQuantity: 3,
    }
    expect(() => giveLineQuantity(allReserved, 'giver', 1)).toThrow('Every copy is reserved by other trades')
    expect(() => giveLineQuantity(allReserved, 'partner', 1)).toThrow('Every copy is reserved by other trades')
  })
})
