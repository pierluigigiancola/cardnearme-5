import { describe, expect, it } from 'vitest'

import { cards } from './data'
import { publicServices } from './public'
import { createStore, traderByUsername } from './store'
import { workspaceFor } from './workspace'

const trader = {
  id: 'collection-test-trader',
  onboarded: true,
  username: 'collector',
}

const found = cards.find(candidate => candidate.gameId === 'mtg' && candidate.finishes.includes('nonfoil'))
if (!found) throw new Error('Seed data has no MTG card')
const card = found

async function ownTwoCopies() {
  const store = createStore()
  const workspace = workspaceFor(trader, store)
  const profile = await workspace.profile.get()
  const entry = (await workspace.binder.addItems([{
    cardId: card.id,
    condition: 'NM',
    finish: 'nonfoil',
    kind: 'collection',
    language: 'en',
    quantity: 2,
  }])).at(0)
  if (!entry) throw new Error('No Collection entry was added')
  return {
    entry,
    profile,
    publicView: publicServices(store),
    store,
    workspace,
  }
}

async function publicHaveIds(publicView: ReturnType<typeof publicServices>, query: {
  ownerUsername?: string;
  citySlug?: string
}) {
  const page = await publicView.trading.listTradeItems({
    listType: 'haves',
    ...query,
  })
  return page.items.map(item => item.id)
}

describe('Haves are Collection entries', () => {
  it('keeps an owned card that is not for trade off the public pages', async () => {
    const { entry, publicView } = await ownTwoCopies()
    expect(entry.kind).toBe('collection')
    expect(entry.kind === 'collection' && entry.forTradeQuantity).toBe(0)
    expect(await publicHaveIds(publicView, { ownerUsername: trader.username })).not.toContain(entry.id)
  })

  it('shows copies marked for trade on the public profile and City page, and only those copies', async () => {
    const { entry, profile, publicView, workspace } = await ownTwoCopies()
    await workspace.binder.updateItem(entry.id, { forTradeQuantity: 1 })

    const page = await publicView.trading.listTradeItems({
      listType: 'haves',
      ownerUsername: trader.username,
    })
    const have = page.items.find(item => item.id === entry.id)
    expect(have?.quantity).toBe(1)
    expect(await publicHaveIds(publicView, { citySlug: profile.citySlug ?? '' })).toContain(entry.id)
  })

  it('takes a card off the public pages when it is unmarked', async () => {
    const { entry, publicView, workspace } = await ownTwoCopies()
    await workspace.binder.updateItem(entry.id, { forTradeQuantity: 2 })
    await workspace.binder.updateItem(entry.id, { forTradeQuantity: 0 })
    expect(await publicHaveIds(publicView, { ownerUsername: trader.username })).not.toContain(entry.id)
  })

  it('refuses more copies for trade than owned', async () => {
    const { entry, workspace } = await ownTwoCopies()
    await expect(workspace.binder.updateItem(entry.id, { forTradeQuantity: 3 })).rejects.toThrow('You own only 2 copies')
  })

  it('records an owned card once: the Collection and Haves views show the same entry', async () => {
    const { entry, workspace } = await ownTwoCopies()
    await workspace.binder.updateItem(entry.id, { forTradeQuantity: 1 })

    const collection = await workspace.binder.listItems({ section: 'collection' })
    const haves = await workspace.binder.listItems({ section: 'haves' })
    expect(collection.items.filter(item => item.card.id === card.id && item.id === entry.id)).toHaveLength(1)
    expect(haves.items.map(item => item.id)).toContain(entry.id)
    const counted = await workspace.binder.getCounts()
    const before = await workspace.binder.updateItem(entry.id, { forTradeQuantity: 2 })
    const after = await workspace.binder.getCounts()
    expect(before.quantity).toBe(2)
    expect(after.haves - counted.haves).toBe(1)
    expect(after.collection).toBe(counted.collection)
  })

  it('adding a card as a Have marks every added copy for trade', async () => {
    const store = createStore()
    const workspace = workspaceFor(trader, store)
    const entry = (await workspace.binder.addItems([{
      cardId: card.id,
      condition: 'NM',
      finish: 'nonfoil',
      forTradeQuantity: 3,
      kind: 'collection',
      language: 'en',
      quantity: 3,
    }])).at(0)
    expect(entry?.kind === 'collection' && entry.forTradeQuantity).toBe(3)
    expect(entry?.listId).not.toBeNull()
  })
})

describe('what a Trader may give', () => {
  async function tradeSetup() {
    const setup = await ownTwoCopies()
    const partnerHave = (await setup.publicView.trading.listTradeItems({ listType: 'haves' })).items
      .find(item => item.ownerUsername !== trader.username)
    if (!partnerHave) throw new Error('Seed data has no partner Have')
    return {
      ...setup,
      partnerHave,
    }
  }

  it('offers every Collection entry of the Trader, including ones not for trade, on their own side', async () => {
    const { entry, partnerHave, workspace } = await tradeSetup()
    const context = await workspace.trades.getContext(partnerHave.ownerUsername)
    expect(context.myItems.map(item => item.id)).toContain(entry.id)

    const trade = await workspace.trades.propose({
      cash: null,
      get: [],
      give: [{
        price: 1,
        quantity: 2,
        sourceId: entry.id,
      }],
      meetAt: null,
      meetup: null,
      note: '',
      partner: partnerHave.ownerUsername,
    })
    expect(trade.proposerGives.map(line => line.sourceId)).toEqual([entry.id])
    expect(trade.proposerGives.at(0)?.quantity).toBe(2)
  })

  it('takes the partner\'s side from their Haves only, as Collection entries', async () => {
    const { partnerHave, store, workspace } = await tradeSetup()
    const partner = traderByUsername(store, partnerHave.ownerUsername)
    const source = partner?.items.find(record => record.id === partnerHave.id)
    expect(source?.kind).toBe('collection')

    const trade = await workspace.trades.propose({
      cash: null,
      get: [{
        price: 1,
        quantity: 99,
        sourceId: partnerHave.id,
      }],
      give: [],
      meetAt: null,
      meetup: null,
      note: '',
      partner: partnerHave.ownerUsername,
    })
    expect(trade.recipientGives.at(0)?.sourceId).toBe(partnerHave.id)
    expect(trade.recipientGives.at(0)?.quantity).toBe(partnerHave.quantity)
  })

  it('refuses a partner card that is not marked for trade', async () => {
    const { partnerHave, store, workspace } = await tradeSetup()
    const partner = traderByUsername(store, partnerHave.ownerUsername)
    const source = partner?.items.find(record => record.id === partnerHave.id)
    if (source?.kind !== 'collection') throw new Error('Partner Have is not a Collection entry')
    source.forTradeQuantity = 0

    await expect(workspace.trades.propose({
      cash: null,
      get: [{
        price: 1,
        quantity: 1,
        sourceId: partnerHave.id,
      }],
      give: [],
      meetAt: null,
      meetup: null,
      note: '',
      partner: partnerHave.ownerUsername,
    })).rejects.toThrow()
  })
})
