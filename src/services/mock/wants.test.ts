import { describe, expect, it } from 'vitest'

import type { WantEntry } from '../types'

import { cards, printings } from './data'
import { publicServices } from './public'
import { createStore } from './store'
import { workspaceFor } from './workspace'

const trader = {
  id: 'wants-test-trader',
  onboarded: true,
  username: 'seeker',
}

// A Card printed in at least two Sets, so a Set filter narrows something.
const reprinted = cards.find(card => new Set(printings.filter(printing => printing.cardId === card.id).map(printing => printing.setCode)).size > 1)
if (!reprinted) throw new Error('Seed data has no reprinted Card')
const card = reprinted
const cardPrintings = printings.filter(printing => printing.cardId === card.id)

async function emptyWants() {
  const store = createStore()
  const workspace = workspaceFor(trader, store)
  const seeded = await workspace.binder.listItems({ section: 'wants' })
  await workspace.binder.removeItems(seeded.items.map(item => item.id))
  return {
    publicView: publicServices(store),
    store,
    workspace,
  }
}

async function myWants(workspace: ReturnType<typeof workspaceFor>) {
  const page = await workspace.binder.listItems({ section: 'wants' })
  return page.items.filter((item): item is WantEntry => item.kind === 'want')
}

describe('Wants target a Card', () => {
  it('adds a Want for any printing of a Card when no filter is given', async () => {
    const { workspace } = await emptyWants()
    await workspace.binder.addItems([{
      cardId: card.id,
      kind: 'want',
      quantity: 2,
    }])

    const want = (await myWants(workspace)).at(0)
    expect(want?.cardId).toBe(card.id)
    expect(want?.quantity).toBe(2)
    expect(want?.filters).toEqual({
      finish: null,
      language: null,
      minCondition: null,
      setCode: null,
    })
    expect(want?.card.cardId).toBe(card.id)
  })

  it('keeps the filters the Trader sets, and shows a Printing from the filtered Set', async () => {
    const { workspace } = await emptyWants()
    const setCode = cardPrintings.at(-1)?.setCode ?? ''
    await workspace.binder.addItems([{
      cardId: card.id,
      filters: {
        language: 'it',
        minCondition: 'EX',
        setCode,
      },
      kind: 'want',
      quantity: 1,
    }])

    const want = (await myWants(workspace)).at(0)
    expect(want?.filters).toEqual({
      finish: null,
      language: 'it',
      minCondition: 'EX',
      setCode,
    })
    expect(want?.card.setCode).toBe(setCode)
  })

  it('refuses a Set filter the Card was never printed in', async () => {
    const { workspace } = await emptyWants()
    await expect(workspace.binder.addItems([{
      cardId: card.id,
      filters: { setCode: 'NOT-A-SET' },
      kind: 'want',
      quantity: 1,
    }])).rejects.toThrow()
  })

  it('shows the filters on the public Wants', async () => {
    const { publicView, workspace } = await emptyWants()
    await workspace.binder.addItems([{
      cardId: card.id,
      filters: { minCondition: 'NM' },
      kind: 'want',
      quantity: 1,
    }])

    const page = await publicView.trading.listTradeItems({
      listType: 'wants',
      ownerId: trader.id,
    })
    expect(page.items.map(item => item.wantFilters)).toEqual([{
      finish: null,
      language: null,
      minCondition: 'NM',
      setCode: null,
    }])
  })

  it('imports Wants for the Card of each matched row', async () => {
    const { workspace } = await emptyWants()
    const printing = cardPrintings.at(0)
    if (!printing) throw new Error('No Printing')
    const draft = await workspace.binder.createImport({
      listId: null,
      rows: [{
        condition: 'EX',
        finish: 'nonfoil',
        language: null,
        line: 1,
        name: printing.name,
        number: printing.number,
        quantity: 3,
        raw: `3 ${printing.name}`,
        setCode: printing.setCode,
      }],
      section: 'wants',
      source: 'text',
    })
    await workspace.binder.commitImport(draft.id)

    const want = (await myWants(workspace)).at(0)
    expect(want?.cardId).toBe(card.id)
    expect(want?.quantity).toBe(3)
    expect(want?.filters).toEqual({
      finish: null,
      language: null,
      minCondition: 'EX',
      setCode: null,
    })
  })

  it('seeds a new Trader with Card-level Wants', async () => {
    const workspace = workspaceFor(trader, createStore())
    const wants = await myWants(workspace)
    const cardIds = new Set(cards.map(candidate => candidate.id))
    expect(wants.length).toBeGreaterThan(0)
    for (const want of wants) expect(cardIds.has(want.cardId)).toBe(true)
  })
})

describe('Trade completion fulfils Wants', () => {
  async function receiveOneCopy() {
    const setup = await emptyWants()
    const partnerHave = (await setup.publicView.trading.listTradeItems({ listType: 'haves' })).items
      .find(item => item.ownerId !== trader.id)
    if (!partnerHave) throw new Error('Seed data has no partner Have')
    const otherFinish = partnerHave.finish === 'foil' ? 'nonfoil' : 'foil'
    await setup.workspace.binder.addItems([{
      cardId: partnerHave.card.cardId,
      filters: { finish: otherFinish },
      kind: 'want',
      quantity: 1,
    }, {
      cardId: partnerHave.card.cardId,
      kind: 'want',
      quantity: 1,
    }])

    const trade = await setup.workspace.trades.propose({
      cash: null,
      get: [{
        price: partnerHave.price,
        quantity: 1,
        sourceId: partnerHave.id,
      }],
      give: [],
      meetAt: null,
      meetup: null,
      note: '',
      partner: partnerHave.ownerId,
    })
    const partner = workspaceFor({
      id: partnerHave.ownerId,
      username: partnerHave.ownerUsername,
    }, setup.store)
    await partner.trades.accept(trade.id)
    await setup.workspace.trades.confirm(trade.id)
    await partner.trades.confirm(trade.id)
    return {
      ...setup,
      otherFinish,
    }
  }

  it('removes a Want for any printing of the received Card', async () => {
    const { workspace } = await receiveOneCopy()
    const wants = await myWants(workspace)
    expect(wants.filter(want => want.filters.finish === null)).toEqual([])
  })

  it('leaves a Want whose filters the received copy does not meet', async () => {
    const { otherFinish, workspace } = await receiveOneCopy()
    const wants = await myWants(workspace)
    expect(wants.map(want => [want.filters.finish, want.quantity])).toEqual([[otherFinish, 1]])
  })
})
