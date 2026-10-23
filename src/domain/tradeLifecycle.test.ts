import { describe, expect, it } from 'vitest'

import { acceptTrade, cancelTrade, confirmTrade, counterOffer, proposeTrade } from './tradeLifecycle'

const AT = '2026-10-20T10:00:00.000Z'
const LATER = '2026-10-21T10:00:00.000Z'

const proposed = () => proposeTrade('alice', 'bob')
const accepted = () => acceptTrade(proposed(), 'bob')

describe('proposeTrade', () => {
  it('opens a pending Trade awaiting the recipient, with nobody confirmed', () => {
    expect(proposed()).toEqual({
      awaiting: 'bob',
      cancelledBy: null,
      confirmedAt: {},
      proposer: 'alice',
      recipient: 'bob',
      status: 'pending',
    })
  })

  it('refuses a Trade with yourself', () => {
    expect(() => proposeTrade('alice', 'alice')).toThrow('You cannot trade with yourself')
  })
})

describe('counterOffer', () => {
  it('makes the counter-offering side the proposer and awaits the other side', () => {
    const countered = counterOffer(proposed(), 'bob')
    expect(countered).toMatchObject({
      awaiting: 'alice',
      proposer: 'bob',
      recipient: 'alice',
      status: 'pending',
    })
  })

  it('lets the proposer edit their own offer, still awaiting the recipient', () => {
    expect(counterOffer(proposed(), 'alice')).toMatchObject({
      awaiting: 'bob',
      proposer: 'alice',
    })
  })

  it('only changes pending Trades', () => {
    expect(() => counterOffer(accepted(), 'bob')).toThrow('Only pending trades can be changed')
  })

  it('refuses someone outside the Trade', () => {
    expect(() => counterOffer(proposed(), 'carol')).toThrow('Trade not found')
  })
})

describe('acceptTrade', () => {
  it('accepts when the awaited side accepts', () => {
    expect(accepted()).toMatchObject({
      awaiting: null,
      confirmedAt: {},
      status: 'accepted',
    })
  })

  it('refuses the side that made the latest offer', () => {
    expect(() => acceptTrade(proposed(), 'alice')).toThrow('This trade is not waiting for you')
    expect(() => acceptTrade(counterOffer(proposed(), 'bob'), 'bob')).toThrow('This trade is not waiting for you')
  })

  it('refuses a Trade that is no longer pending', () => {
    expect(() => acceptTrade(accepted(), 'bob')).toThrow('This trade is not waiting for you')
  })
})

describe('confirmTrade', () => {
  it('records one confirmation without completing the Trade', () => {
    expect(confirmTrade(accepted(), 'alice', AT)).toMatchObject({
      confirmedAt: { alice: AT },
      status: 'accepted',
    })
  })

  it('completes the Trade when the second Trader confirms', () => {
    const once = confirmTrade(accepted(), 'alice', AT)
    expect(confirmTrade(once, 'bob', LATER)).toMatchObject({
      confirmedAt: {
        alice: AT,
        bob: LATER,
      },
      status: 'completed',
    })
  })

  it('refuses a second confirmation by the same Trader', () => {
    const once = confirmTrade(accepted(), 'alice', AT)
    expect(() => confirmTrade(once, 'alice', LATER)).toThrow('You already confirmed this trade')
  })

  it('only confirms accepted Trades', () => {
    expect(() => confirmTrade(proposed(), 'alice', AT)).toThrow('Only accepted trades can be confirmed')
  })

  it('refuses someone outside the Trade', () => {
    expect(() => confirmTrade(accepted(), 'carol', AT)).toThrow('Trade not found')
  })
})

describe('cancelTrade', () => {
  it('lets either side cancel a pending Trade', () => {
    expect(cancelTrade(proposed(), 'bob')).toMatchObject({
      awaiting: null,
      cancelledBy: 'bob',
      status: 'cancelled',
    })
    expect(cancelTrade(proposed(), 'alice').cancelledBy).toBe('alice')
  })

  it('lets either side cancel an accepted Trade, even after one has confirmed', () => {
    const once = confirmTrade(accepted(), 'alice', AT)
    expect(cancelTrade(once, 'alice').status).toBe('cancelled')
    expect(cancelTrade(once, 'bob').status).toBe('cancelled')
  })

  it('refuses to cancel once both have confirmed', () => {
    const done = confirmTrade(confirmTrade(accepted(), 'alice', AT), 'bob', LATER)
    expect(() => cancelTrade(done, 'alice')).toThrow('This trade is already closed')
  })

  it('refuses someone outside the Trade', () => {
    expect(() => cancelTrade(proposed(), 'carol')).toThrow('Trade not found')
  })
})
