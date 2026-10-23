import { describe, expect, it } from 'vitest'

import { afterGiving, checkForTradeQuantity, isHave } from './collection'

describe('isHave', () => {
  it('is a Have when at least one copy is for trade', () => {
    expect(isHave({ forTradeQuantity: 1 })).toBe(true)
  })

  it('is not a Have when no copy is for trade', () => {
    expect(isHave({ forTradeQuantity: 0 })).toBe(false)
  })
})

describe('checkForTradeQuantity', () => {
  it('accepts anything from none to every copy owned', () => {
    expect(checkForTradeQuantity(3, 0)).toBe(0)
    expect(checkForTradeQuantity(3, 2)).toBe(2)
    expect(checkForTradeQuantity(3, 3)).toBe(3)
  })

  it('refuses more copies for trade than owned', () => {
    expect(() => checkForTradeQuantity(2, 3)).toThrow('You own only 2 copies')
  })

  it('refuses negative or fractional quantities', () => {
    expect(() => checkForTradeQuantity(2, -1)).toThrow()
    expect(() => checkForTradeQuantity(2, 1.5)).toThrow()
  })
})

describe('afterGiving', () => {
  it('takes given copies out of the for-trade ones first', () => {
    expect(afterGiving({
      forTradeQuantity: 1,
      quantity: 3,
    }, 1)).toEqual({
      forTradeQuantity: 0,
      quantity: 2,
    })
  })

  it('keeps the rest of the for-trade copies', () => {
    expect(afterGiving({
      forTradeQuantity: 3,
      quantity: 4,
    }, 2)).toEqual({
      forTradeQuantity: 1,
      quantity: 2,
    })
  })

  it('leaves nothing when every copy is given', () => {
    expect(afterGiving({
      forTradeQuantity: 1,
      quantity: 2,
    }, 2)).toEqual({
      forTradeQuantity: 0,
      quantity: 0,
    })
  })

  it('never goes below zero', () => {
    expect(afterGiving({
      forTradeQuantity: 0,
      quantity: 1,
    }, 3)).toEqual({
      forTradeQuantity: 0,
      quantity: 0,
    })
  })
})
