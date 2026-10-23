import { describe, expect, it } from 'vitest'

import type { TradeListType } from '../types'

import { printings } from './data'
import { publicServices } from './public'
import { createStore } from './store'
import { workspaceFor } from './workspace'

const trader = {
  id: 'lists-test-trader',
  onboarded: true,
  username: 'lister',
}

const found = printings.find(candidate => candidate.gameId === 'mtg' && candidate.finishes.includes('nonfoil'))
if (!found) throw new Error('Seed data has no MTG card')
const card = found

async function setUp() {
  const store = createStore()
  const workspace = workspaceFor(trader, store)
  const profile = await workspace.profile.get()
  const list = await workspace.lists.create({
    gameId: null,
    name: 'Showcase',
    type: 'haves',
    visibility: 'public',
  })
  const wantsList = await workspace.lists.create({
    gameId: null,
    name: 'Chase cards',
    type: 'wants',
    visibility: 'public',
  })
  const added = await workspace.binder.addItems([
    {
      condition: 'NM',
      finish: 'nonfoil',
      forTradeQuantity: 1,
      kind: 'collection',
      language: 'en',
      listId: list.id,
      printingId: card.id,
      quantity: 2,
    },
    {
      condition: 'NM',
      finish: 'nonfoil',
      kind: 'want',
      language: 'en',
      listId: wantsList.id,
      printingId: card.id,
      quantity: 1,
    },
  ])
  const have = added.at(0)
  const want = added.at(1)
  if (!have || !want) throw new Error('Entries were not added')
  return {
    have,
    list,
    profile,
    publicView: publicServices(store),
    want,
    wantsList,
    workspace,
  }
}

async function publicIds(publicView: ReturnType<typeof publicServices>, listType: TradeListType, query: {
  ownerId?: string;
  citySlug?: string
}) {
  const page = await publicView.trading.listTradeItems({
    listType,
    ...query,
  })
  return page.items.map(item => item.id)
}

describe('Lists hold visibility', () => {
  it('gives a new Trader one default Haves List and one default Wants List', async () => {
    const workspace = workspaceFor({
      id: 'brand-new-trader',
      username: 'newcomer',
    }, createStore())
    const lists = await workspace.lists.list()
    expect(lists.filter(list => list.isDefault).map(list => list.type)
      .sort()).toEqual(['haves', 'wants'])
  })

  it('puts every Collection entry and Want on a List, even an owned card that is not for trade', async () => {
    const { workspace } = await setUp()
    const offTrade = (await workspace.binder.addItems([{
      condition: 'GD',
      finish: 'nonfoil',
      kind: 'collection',
      language: 'it',
      printingId: card.id,
      quantity: 1,
    }])).at(0)
    const defaultHaves = (await workspace.lists.list({ type: 'haves' })).find(list => list.isDefault)
    expect(offTrade?.listId).toBe(defaultHaves?.id)
    const items = [
      ...(await workspace.binder.listItems({ section: 'collection' })).items,
      ...(await workspace.binder.listItems({ section: 'wants' })).items,
    ]
    expect(items.length).toBeGreaterThan(0)
    expect(items.filter(item => typeof item.listId !== 'string')).toEqual([])
  })

  it('hides a private List\'s Haves from the public profile and City page, but not from the owner\'s Binder', async () => {
    const { have, list, profile, publicView, workspace } = await setUp()
    expect(await publicIds(publicView, 'haves', { ownerId: trader.id })).toContain(have.id)

    await workspace.lists.update(list.id, { visibility: 'private' })

    expect(await publicIds(publicView, 'haves', { ownerId: trader.id })).not.toContain(have.id)
    expect(await publicIds(publicView, 'haves', { citySlug: profile.citySlug ?? '' })).not.toContain(have.id)
    expect((await workspace.binder.listItems({ section: 'haves' })).items.map(item => item.id)).toContain(have.id)

    await workspace.lists.update(list.id, { visibility: 'public' })
    expect(await publicIds(publicView, 'haves', { ownerId: trader.id })).toContain(have.id)
  })

  it('hides a private List\'s Wants from other Traders', async () => {
    const { publicView, want, wantsList, workspace } = await setUp()
    expect(await publicIds(publicView, 'wants', { ownerId: trader.id })).toContain(want.id)
    await workspace.lists.update(wantsList.id, { visibility: 'private' })
    expect(await publicIds(publicView, 'wants', { ownerId: trader.id })).not.toContain(want.id)
  })

  it('deleting a Haves List takes its cards off trade and keeps them in the Collection, on the default Haves List', async () => {
    const { have, list, publicView, workspace } = await setUp()
    await workspace.lists.remove(list.id)

    const collection = (await workspace.binder.listItems({ section: 'collection' })).items
    const kept = collection.find(item => item.id === have.id)
    const defaultHaves = (await workspace.lists.list({ type: 'haves' })).find(item => item.isDefault)
    expect(kept).toMatchObject({
      forTradeQuantity: 0,
      listId: defaultHaves?.id,
      quantity: 2,
    })
    expect(await publicIds(publicView, 'haves', { ownerId: trader.id })).not.toContain(have.id)
  })

  it('deleting a Wants List deletes its Wants', async () => {
    const { want, wantsList, workspace } = await setUp()
    await workspace.lists.remove(wantsList.id)
    expect((await workspace.binder.listItems({ section: 'wants' })).items.map(item => item.id)).not.toContain(want.id)
  })

  it('refuses to delete a default List', async () => {
    const { workspace } = await setUp()
    const defaults = (await workspace.lists.list()).filter(list => list.isDefault)
    expect(defaults).toHaveLength(2)
    for (const list of defaults) await expect(workspace.lists.remove(list.id)).rejects.toThrow('default')
  })
})
