import { describe, expect, it } from 'vitest'

import { marketValue, tradeFromPerspective, tradeValue } from './tradeValue'

import type { Trade, TradeLine } from '#/services/types'
import { makePrinting } from '#/test/fixtures'

function line(id: string, price: number, quantity = 1, marketPrice = price): TradeLine {
  return {
    card: makePrinting({ name: id }),
    condition: 'NM',
    finish: 'nonfoil',
    id,
    language: 'en',
    marketPrice,
    price,
    quantity,
    sourceId: `source-${id}`,
  }
}

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    awaiting: 'bob',
    cancelledBy: null,
    cashAmount: 0,
    cashPayer: null,
    chatId: 'chat-1',
    confirmedAt: {},
    createdAt: '2026-10-18T10:00:00.000Z',
    id: 'trade-1',
    meetAt: null,
    meetup: null,
    note: '',
    // 2 × 10 + 5.5 = 25.5
    proposer: 'alice',
    proposerGives: [line('bolt', 10, 2), line('opt', 5.5)],
    recipient: 'bob',
    // 30
    recipientGives: [line('ring', 30)],
    status: 'pending',
    updatedAt: '2026-10-18T10:00:00.000Z',
    ...overrides,
  }
}

describe('tradeValue / marketValue', () => {
  it('multiplies by quantity and rounds to cents', () => {
    // 0.1 × 3 + 0.2 and 0.2 × 3 + 1.25 both carry float residue before rounding.
    const lines = [line('a', 0.1, 3, 0.2), line('b', 0.2, 1, 1.25)]
    expect(tradeValue(lines)).toBe(0.5)
    expect(marketValue(lines)).toBe(1.85)
    expect(tradeValue([])).toBe(0)
  })
})

describe('tradeFromPerspective', () => {
  it('shows the proposer what they give and get', () => {
    const trade = makeTrade()
    const view = tradeFromPerspective(trade, 'alice')
    expect(view.partner).toBe('bob')
    expect(view.give).toBe(trade.proposerGives)
    expect(view.get).toBe(trade.recipientGives)
    expect(view).toMatchObject({
      difference: -4.5,
      myCash: 0,
      myTotal: 25.5,
      theirCash: 0,
      theirTotal: 30,
    })
  })

  it('shows the recipient the mirrored trade', () => {
    const trade = makeTrade()
    const view = tradeFromPerspective(trade, 'bob')
    expect(view.partner).toBe('alice')
    expect(view.give).toBe(trade.recipientGives)
    expect(view.get).toBe(trade.proposerGives)
    expect(view).toMatchObject({
      difference: 4.5,
      myCash: 0,
      myTotal: 30,
      theirCash: 0,
      theirTotal: 25.5,
    })
  })

  it('counts cash on the side of whoever pays it', () => {
    const trade = makeTrade({
      cashAmount: 4.5,
      cashPayer: 'alice',
    })
    expect(tradeFromPerspective(trade, 'alice')).toMatchObject({
      difference: 0,
      myCash: 4.5,
      myTotal: 30,
      theirCash: 0,
      theirTotal: 30,
    })
    expect(tradeFromPerspective(trade, 'bob')).toMatchObject({
      difference: 0,
      myCash: 0,
      myTotal: 30,
      theirCash: 4.5,
      theirTotal: 30,
    })
  })

  it('is positive when the viewer gives more value, and mirrors for the partner', () => {
    const trade = makeTrade({
      cashAmount: 2,
      cashPayer: 'bob',
    })
    const alice = tradeFromPerspective(trade, 'alice')
    const bob = tradeFromPerspective(trade, 'bob')
    expect(alice.difference).toBe(-6.5)
    expect(bob.difference).toBe(6.5)
    expect(bob.myTotal).toBe(32)
    expect(alice.theirTotal).toBe(32)
  })

  it('ignores the cash amount when nobody pays it', () => {
    const view = tradeFromPerspective(makeTrade({
      cashAmount: 50,
      cashPayer: null,
    }), 'alice')
    expect(view.myCash).toBe(0)
    expect(view.theirCash).toBe(0)
    expect(view.difference).toBe(-4.5)
  })

  // Alice gives 10.10 of cards plus 0.20 cash; Bob gives 10.30. The cash is
  // added after rounding, so the totals differ by float residue.
  const balancedWithCash = makeTrade({
    cashAmount: 0.2,
    cashPayer: 'alice',
    proposerGives: [line('a', 10.1)],
    recipientGives: [line('b', 10.3)],
  })

  // A residue below zero used to round to -0, which formatPrice renders as "-€0.00".
  it('rounds the difference to cents, never to negative zero', () => {
    expect(tradeFromPerspective(balancedWithCash, 'alice').difference).toBe(0)
    expect(tradeFromPerspective(balancedWithCash, 'bob').difference).toBe(0)
  })

  it('handles a one-sided trade balanced with cash', () => {
    const view = tradeFromPerspective(makeTrade({
      cashAmount: 25.5,
      cashPayer: 'bob',
      recipientGives: [],
    }), 'bob')
    expect(view).toMatchObject({
      difference: 0,
      get: makeTrade().proposerGives,
      give: [],
      myCash: 25.5,
      myTotal: 25.5,
      theirTotal: 25.5,
    })
  })
})
