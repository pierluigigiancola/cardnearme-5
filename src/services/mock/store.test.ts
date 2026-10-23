import { describe, expect, it } from 'vitest'

import { cards } from './data'
import { publicServices } from './public'
import { createStore } from './store'
import { workspaceFor } from './workspace'

const trader = {
  id: 'store-test-trader',
  onboarded: true,
  username: 'storetester',
}

const cardId = cards.find(card => card.gameId === 'mtg')?.id ?? ''

async function addHave() {
  const store = createStore()
  const workspace = workspaceFor(trader, store)
  const profile = await workspace.profile.get()
  const added = await workspace.binder.addItems([{
    cardId,
    condition: 'NM',
    finish: 'nonfoil',
    language: 'en',
    quantity: 1,
    section: 'haves',
  }])
  const have = added.at(0)
  if (!have) throw new Error('No Have was added')
  return {
    have,
    profile,
    publicView: publicServices(store),
    store,
    workspace,
  }
}

describe('one mock store', () => {
  it('shows a Have added in the Binder on the owner\'s public profile', async () => {
    const { have, publicView } = await addHave()
    const page = await publicView.trading.listTradeItems({
      listType: 'haves',
      ownerUsername: trader.username,
    })
    expect(page.items.map(item => item.id)).toContain(have.id)
  })

  it('shows a Have added in the Binder on the owner\'s City and Store pages', async () => {
    const { have, profile, publicView } = await addHave()
    const storeSlug = profile.storeSlugs.at(0)
    if (!profile.citySlug || !storeSlug) throw new Error('Seeded trader has no City or Store')

    const inCity = await publicView.trading.listTradeItems({
      citySlug: profile.citySlug,
      listType: 'haves',
    })
    const inStore = await publicView.trading.listTradeItems({
      listType: 'haves',
      storeSlug,
    })
    expect(inCity.items.map(item => item.id)).toContain(have.id)
    expect(inStore.items.map(item => item.id)).toContain(have.id)
  })

  it('keeps Haves on a private List off the public pages', async () => {
    const { have, publicView, workspace } = await addHave()
    const hidden = await workspace.lists.create({
      gameId: null,
      name: 'Not for now',
      type: 'haves',
      visibility: 'private',
    })
    await workspace.binder.moveItems([have.id], {
      listId: hidden.id,
      section: 'haves',
    })
    const page = await publicView.trading.listTradeItems({
      listType: 'haves',
      ownerUsername: trader.username,
    })
    expect(page.items.map(item => item.id)).not.toContain(have.id)
  })

  it('shows a signed-in Trader\'s public profile', async () => {
    const { profile, publicView } = await addHave()
    const user = await publicView.community.getUser(trader.username)
    expect(user?.citySlugs).toEqual([profile.citySlug])
  })

  it('keeps each store\'s Traders apart', async () => {
    await addHave()
    const other = publicServices(createStore())
    expect(await other.community.getUser(trader.username)).toBeNull()
  })
})
