import { describe, expect, it } from 'vitest'

import { checkOwnedQuantity, checkReservable, completionChanges, freeQuantity, reservedQuantities } from './reservation'

import type { Trade, TradeLine, TradeStatus } from '#/services/types'
import { makePrinting } from '#/test/fixtures'

function line(sourceId: string, quantity = 1, name = sourceId): TradeLine {
  return {
    card: makePrinting({ name }),
    condition: 'NM',
    finish: 'nonfoil',
    id: `line-${sourceId}-${quantity}`,
    language: 'en',
    marketPrice: 1,
    price: 1,
    quantity,
    sourceId,
  }
}

function trade(status: TradeStatus, proposerGives: TradeLine[], recipientGives: TradeLine[] = []): Pick<Trade, 'proposer' | 'proposerGives' | 'recipient' | 'recipientGives' | 'status'> {
  return {
    proposer: 'alice',
    proposerGives,
    recipient: 'bob',
    recipientGives,
    status,
  }
}

describe('reservedQuantities', () => {
  it('adds up what a Trader gives in accepted Trades, per Collection entry', () => {
    const reserved = reservedQuantities([
      trade('accepted', [line('bolt', 2)]),
      trade('accepted', [line('bolt', 1), line('opt', 1)], [line('ring', 1)]),
    ], 'alice')
    expect(Object.fromEntries(reserved)).toEqual({
      bolt: 3,
      opt: 1,
    })
  })

  it('counts the recipient side for the recipient', () => {
    const reserved = reservedQuantities([trade('accepted', [line('bolt')], [line('ring', 2)])], 'bob')
    expect(Object.fromEntries(reserved)).toEqual({ ring: 2 })
  })

  it('reserves nothing for pending proposals, or for closed Trades', () => {
    const reserved = reservedQuantities([
      trade('pending', [line('bolt')]),
      trade('cancelled', [line('bolt')]),
      trade('completed', [line('bolt')]),
    ], 'alice')
    expect(reserved.size).toBe(0)
  })
})

describe('freeQuantity', () => {
  it('is the copies owned minus the reserved ones', () => {
    expect(freeQuantity({
      forTradeQuantity: 1,
      quantity: 3,
      reservedQuantity: 2,
    })).toBe(1)
    expect(freeQuantity({
      forTradeQuantity: 0,
      quantity: 3,
    })).toBe(3)
  })
})

describe('checkOwnedQuantity', () => {
  it('accepts any number of copies down to the reserved ones', () => {
    expect(checkOwnedQuantity(2, 2)).toBe(2)
    expect(checkOwnedQuantity(5, 0)).toBe(5)
    expect(checkOwnedQuantity(0, 0)).toBe(0)
  })

  it('refuses fewer copies than are reserved, removal included', () => {
    expect(() => checkOwnedQuantity(1, 2)).toThrow('2 copies are reserved by accepted trades; cancel them first')
    expect(() => checkOwnedQuantity(0, 1)).toThrow('1 copy is reserved by an accepted trade; cancel it first')
  })
})

describe('checkReservable', () => {
  const free: Record<string, number> = {
    bolt: 2,
    opt: 0,
  }
  const freeOf = (sourceId: string) => free[sourceId] ?? 0

  it('accepts lines that fit within the free copies', () => {
    expect(() => checkReservable([line('bolt', 2)], freeOf)).not.toThrow()
  })

  it('refuses lines needing more copies than owned minus reserved, adding up lines of one entry', () => {
    expect(() => checkReservable([line('bolt', 1, 'Lightning Bolt'), line('bolt', 2, 'Lightning Bolt')], freeOf))
      .toThrow('Only 2 copies of Lightning Bolt are owned and not reserved by other trades')
    expect(() => checkReservable([line('opt', 1, 'Opt')], freeOf))
      .toThrow('Only 0 copies of Opt are owned and not reserved by other trades')
  })

  it('refuses a line whose Collection entry is gone', () => {
    expect(() => checkReservable([line('gone', 1, 'Gone Card')], freeOf)).toThrow('Gone Card')
  })
})

describe('completionChanges', () => {
  const done = trade('completed', [line('bolt', 2)], [line('ring', 1)])

  it('gives both Traders their Binder changes together', () => {
    const changes = completionChanges(done)
    expect(changes.map(change => ({
      gives: change.gives.map(given => given.sourceId),
      receives: change.receives.map(received => received.sourceId),
      trader: change.trader,
    }))).toEqual([
      {
        gives: ['bolt'],
        receives: ['ring'],
        trader: 'alice',
      },
      {
        gives: ['ring'],
        receives: ['bolt'],
        trader: 'bob',
      },
    ])
  })

  it('has no changes for a Trade that is not completed', () => {
    expect(() => completionChanges(trade('accepted', [line('bolt')]))).toThrow('Only completed trades change Binders')
  })
})
