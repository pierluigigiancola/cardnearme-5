import { describe, expect, it } from 'vitest'

import type { TradeDraft } from '../types'

import { printings } from './data'
import { createStore } from './store'
import type { MockStore } from './store'
import { workspaceFor } from './workspace'

const MILAN = 'milan--italy'
const VIGEVANO = 'vigevano--italy'

const me = {
  id: 'matching-test-trader',
  onboarded: true,
  username: 'matcher',
}

/** A seeded Trader in a City, with a workspace of their own on the same store. */
function seededTraderIn(store: MockStore, citySlug: string) {
  const trader = [...store.traders.values()].find(candidate => candidate.profile.citySlug === citySlug && candidate.id !== me.id)
  if (!trader) throw new Error(`No seeded Trader in ${citySlug}`)
  return {
    trader,
    workspace: workspaceFor({
      id: trader.id,
      username: trader.profile.username,
    }, store),
  }
}

/** A Printing nobody in the store owns or wants yet, so a Match on it can only come from the test. */
function unusedPrinting(store: MockStore, finish: 'foil' | 'nonfoil' = 'nonfoil') {
  const used = new Set<string>()
  for (const trader of store.traders.values()) {
    for (const record of trader.items) used.add(record.kind === 'collection' ? (printings.find(p => p.id === record.printingId)?.cardId ?? '') : record.cardId)
  }
  const printing = printings.find(candidate => !used.has(candidate.cardId) && candidate.finishes.includes(finish) && candidate.finishes.includes('nonfoil'))
  if (!printing) throw new Error('No unused Printing in the catalogue')
  return printing
}

function haveInput(printingId: string, finish: 'foil' | 'nonfoil' = 'nonfoil') {
  return {
    condition: 'NM' as const,
    finish,
    forTradeQuantity: 1,
    kind: 'collection' as const,
    language: 'en' as const,
    printingId,
    quantity: 1,
  }
}

function draftFor(partner: string, sourceId: string, price: number): TradeDraft {
  return {
    cash: null,
    get: [{
      price,
      quantity: 1,
      sourceId,
    }],
    give: [],
    meetAt: null,
    meetup: null,
    note: '',
    partner,
  }
}

describe('City-scoped Matching across Traders', () => {
  it('shows a Have another Trader in my City just added as a Match for my Want', async () => {
    const store = createStore()
    const workspace = workspaceFor(me, store)
    const printing = unusedPrinting(store)
    const bob = seededTraderIn(store, MILAN)
    await workspace.binder.addItems([{
      cardId: printing.cardId,
      kind: 'want',
      quantity: 1,
    }])

    const before = await workspace.trades.listMatches({ citySlug: MILAN })
    expect(before.flatMap(match => match.theyHave).some(item => item.card.cardId === printing.cardId)).toBe(false)

    const [added] = await bob.workspace.binder.addItems([haveInput(printing.id)])
    const after = await workspace.trades.listMatches({ citySlug: MILAN })
    const withBob = after.find(match => match.partner.id === bob.trader.id)
    expect(withBob?.theyHave.map(item => item.id)).toContain(added.id)
    expect(withBob?.citySlug).toBe(MILAN)
  })

  it('does not match a Have that misses a filter my Want sets', async () => {
    const store = createStore()
    const workspace = workspaceFor(me, store)
    const printing = unusedPrinting(store, 'foil')
    const bob = seededTraderIn(store, MILAN)
    await workspace.binder.addItems([{
      cardId: printing.cardId,
      filters: { finish: 'foil' },
      kind: 'want',
      quantity: 1,
    }])
    const [nonfoil] = await bob.workspace.binder.addItems([haveInput(printing.id, 'nonfoil')])

    const matches = await workspace.trades.listMatches({ citySlug: MILAN })
    expect(matches.flatMap(match => match.theyHave).map(item => item.id)).not.toContain(nonfoil.id)
  })

  it('defaults to my own City and leaves out Traders in other Cities', async () => {
    const store = createStore()
    const workspace = workspaceFor(me, store)
    const matches = await workspace.trades.listMatches()
    expect(matches.length).toBeGreaterThan(0)
    for (const match of matches) {
      expect(match.citySlug).toBe(MILAN)
      expect(store.traders.get(match.partner.id)?.profile.citySlug).toBe(MILAN)
    }
  })

  it('narrows the City to a Store\'s Traders when given one', async () => {
    const store = createStore()
    const workspace = workspaceFor(me, store)
    const storeSlug = seededTraderIn(store, MILAN).trader.profile.storeSlugs[0]
    const matches = await workspace.trades.listMatches({
      citySlug: MILAN,
      storeSlug,
    })
    for (const match of matches) expect(match.partner.storeSlugs).toContain(storeSlug)
  })
})

describe('Trade eligibility', () => {
  it('shows Matches in a locked City, but refuses proposing there', async () => {
    const store = createStore()
    const workspace = workspaceFor(me, store)
    const printing = unusedPrinting(store)
    const local = seededTraderIn(store, VIGEVANO)
    await workspace.profile.update({ citySlug: VIGEVANO })
    await workspace.binder.addItems([{
      cardId: printing.cardId,
      kind: 'want',
      quantity: 1,
    }])
    const [added] = await local.workspace.binder.addItems([haveInput(printing.id)])

    const match = (await workspace.trades.listMatches()).find(candidate => candidate.partner.id === local.trader.id)
    expect(match?.theyHave.map(item => item.id)).toContain(added.id)
    expect(match?.eligibility).toEqual({
      canPropose: false,
      reason: 'Trading in Vigevano unlocks once 3 traders have joined (1 so far).',
    })
    await expect(workspace.trades.propose(draftFor(local.trader.id, added.id, 1))).rejects.toThrow('Trading in Vigevano unlocks')
  })

  it('lets Traders in different unlocked Cities trade', async () => {
    const store = createStore()
    const workspace = workspaceFor(me, store)
    const printing = unusedPrinting(store)
    const roman = seededTraderIn(store, 'rome--italy')
    const [added] = await roman.workspace.binder.addItems([haveInput(printing.id)])

    const trade = await workspace.trades.propose(draftFor(roman.trader.id, added.id, 1))
    expect(trade.status).toBe('pending')
    expect(trade.recipient).toBe(roman.trader.id)
  })

  it('marks Matches in an unlocked City as open to proposals', async () => {
    const matches = await workspaceFor(me, createStore()).trades.listMatches()
    expect(matches.every(match => match.eligibility.canPropose)).toBe(true)
  })
})
