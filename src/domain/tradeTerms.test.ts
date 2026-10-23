import { describe, expect, it } from 'vitest'

import { checkTradeParties, tradeCash } from './tradeTerms'

describe('checkTradeParties', () => {
  it('accepts two different Traders with at least one card between them', () => {
    expect(() => checkTradeParties('ana', 'ben', {
      get: 0,
      give: 1,
    })).not.toThrow()
    expect(() => checkTradeParties('ana', 'ben', {
      get: 2,
      give: 0,
    })).not.toThrow()
  })

  it('refuses a Trade with yourself', () => {
    expect(() => checkTradeParties('ana', 'ana', {
      get: 1,
      give: 1,
    })).toThrow('You cannot trade with yourself')
  })

  it('refuses a Trade with no cards, even with cash', () => {
    expect(() => checkTradeParties('ana', 'ben', {
      get: 0,
      give: 0,
    })).toThrow('Add at least one card to the trade')
  })
})

describe('tradeCash', () => {
  it('rounds the amount to cents and names who pays', () => {
    expect(tradeCash({
      amount: 12.345,
      payer: 'me',
    }, 'ana', 'ben')).toEqual({
      cashAmount: 12.35,
      cashPayer: 'ana',
    })
    expect(tradeCash({
      amount: 5,
      payer: 'partner',
    }, 'ana', 'ben')).toEqual({
      cashAmount: 5,
      cashPayer: 'ben',
    })
  })

  it('has no payer when there is no cash', () => {
    expect(tradeCash(null, 'ana', 'ben')).toEqual({
      cashAmount: 0,
      cashPayer: null,
    })
    expect(tradeCash({
      amount: 0,
      payer: 'me',
    }, 'ana', 'ben')).toEqual({
      cashAmount: 0,
      cashPayer: null,
    })
  })

  it('refuses a negative or non-finite amount', () => {
    expect(() => tradeCash({
      amount: -1,
      payer: 'me',
    }, 'ana', 'ben')).toThrow('Cash must be a positive amount')
    expect(() => tradeCash({
      amount: Number.NaN,
      payer: 'me',
    }, 'ana', 'ben')).toThrow('Cash must be a positive amount')
  })
})
