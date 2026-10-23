import { afterEach, describe, expect, it, vi } from 'vitest'

import type { WorkspaceServices } from '../services'
import type { CollectionEntry, UserId } from '../types'

import { createStore } from './store'
import { workspaceFor } from './workspace'

const me = {
  id: 'confirmation-test-trader',
  onboarded: true,
  username: 'confirmer',
}

/** A Trader's Collection entries, as their own trade builder sees them. */
async function collectionOf(workspace: WorkspaceServices, partner: UserId) {
  return (await workspace.trades.getContext(partner)).myItems
}

function copiesOf(entries: CollectionEntry[], printingId: string) {
  return entries.filter(entry => entry.card.id === printingId).reduce((sum, entry) => sum + entry.quantity, 0)
}

/**
 * The signed-in Trader and a seeded partner in one fresh store. The Trader
 * owns three copies of one card (`mine`); the partner has `theirs` for trade.
 */
async function setUp() {
  const store = createStore()
  const workspace = workspaceFor(me, store)
  const match = (await workspace.trades.listMatches()).at(0)
  if (!match) throw new Error('Seeded workspace has no matches')
  const partner = match.partner
  const partnerWorkspace = workspaceFor({
    id: partner.id,
    username: partner.username,
  }, store)
  const context = await workspace.trades.getContext(partner.id)
  const theirs = context.partnerHaves.at(0)
  const mine = context.myItems.find(entry => entry.reservedQuantity === 0 && entry.quantity >= 1)
  if (!theirs || !mine) throw new Error('Seed data has no cards to trade')
  const updated = await workspace.binder.updateItem(mine.id, { quantity: 3 })
  if (updated.kind !== 'collection') throw new Error('Expected a Collection entry')

  const propose = (give: number) => workspace.trades.propose({
    cash: null,
    get: [{
      price: theirs.price,
      quantity: 1,
      sourceId: theirs.id,
    }],
    give: [{
      price: mine.price,
      quantity: give,
      sourceId: mine.id,
    }],
    meetAt: null,
    meetup: null,
    note: '',
    partner: partner.id,
  })

  return {
    mine: updated,
    myEntry: async () => (await collectionOf(workspace, partner.id)).find(entry => entry.id === mine.id),
    partner,
    partnerWorkspace,
    propose,
    theirEntry: async () => (await collectionOf(partnerWorkspace, me.id)).find(entry => entry.id === theirs.id),
    theirs,
    workspace,
  }
}

async function acceptedTrade(give = 2) {
  const setup = await setUp()
  const trade = await setup.propose(give)
  await setup.partnerWorkspace.trades.accept(trade.id)
  return {
    ...setup,
    trade,
  }
}

describe('reservation', () => {
  it('reserves nothing for a pending proposal', async () => {
    const { myEntry, propose, theirEntry } = await setUp()
    await propose(2)
    expect((await myEntry())?.reservedQuantity).toBe(0)
    expect((await theirEntry())?.reservedQuantity).toBe(0)
  })

  it('reserves both sides\' cards when the Trade is accepted, and shows it in the Binder', async () => {
    const { mine, myEntry, theirEntry, workspace } = await acceptedTrade(2)
    expect((await myEntry())?.reservedQuantity).toBe(2)
    expect((await theirEntry())?.reservedQuantity).toBe(1)
    const binder = await workspace.binder.listItems({ section: 'collection' })
    expect(binder.items.find(item => item.id === mine.id)).toMatchObject({ reservedQuantity: 2 })
  })

  it('refuses an acceptance needing more copies than owned minus reserved', async () => {
    const { mine, partnerWorkspace, propose } = await setUp()
    const first = await propose(2)
    const second = await propose(2)
    await partnerWorkspace.trades.accept(first.id)
    await expect(partnerWorkspace.trades.accept(second.id)).rejects.toThrow(`Only 1 copy of ${mine.card.name} is owned and not reserved by other trades`)
  })

  it('releases the reservation when the Trade is cancelled', async () => {
    const { myEntry, trade, workspace } = await acceptedTrade(2)
    await workspace.trades.confirm(trade.id)
    await workspace.trades.cancel(trade.id)
    expect((await myEntry())?.reservedQuantity).toBe(0)
  })
})

describe('mutual confirmation', () => {
  it('records one Trader\'s confirmation without touching either Binder', async () => {
    const { myEntry, theirEntry, trade, workspace } = await acceptedTrade(2)
    const confirmed = await workspace.trades.confirm(trade.id)
    expect(confirmed.status).toBe('accepted')
    expect(confirmed.confirmedAt[me.id]).toEqual(expect.any(String))
    expect((await myEntry())?.quantity).toBe(3)
    expect((await theirEntry())?.quantity).toBeGreaterThanOrEqual(1)
  })

  it('refuses to confirm twice', async () => {
    const { trade, workspace } = await acceptedTrade()
    await workspace.trades.confirm(trade.id)
    await expect(workspace.trades.confirm(trade.id)).rejects.toThrow('You already confirmed this trade')
  })

  it('completes on the second confirmation and updates both Binders in that step', async () => {
    const { mine, myEntry, partner, partnerWorkspace, theirEntry, theirs, trade, workspace } = await acceptedTrade(2)
    const theirCopiesBefore = (await theirEntry())?.quantity ?? 0
    const myCopiesOfTheirs = copiesOf(await collectionOf(workspace, partner.id), theirs.card.id)
    const theirCopiesOfMine = copiesOf(await collectionOf(partnerWorkspace, me.id), mine.card.id)

    await workspace.trades.confirm(trade.id)
    const completed = await partnerWorkspace.trades.confirm(trade.id)

    expect(completed.status).toBe('completed')
    expect(Object.keys(completed.confirmedAt).sort()).toEqual([me.id, partner.id].sort())
    // The giver's entry loses the given copies, and their reservation with them.
    expect(await myEntry()).toMatchObject({
      quantity: 1,
      reservedQuantity: 0,
    })
    const theirAfter = await theirEntry()
    expect(theirAfter?.quantity ?? 0).toBe(theirCopiesBefore - 1)
    expect(theirAfter?.reservedQuantity ?? 0).toBe(0)
    // The receiver's Collection gains them.
    expect(copiesOf(await collectionOf(workspace, partner.id), theirs.card.id)).toBe(myCopiesOfTheirs + 1)
    expect(copiesOf(await collectionOf(partnerWorkspace, me.id), mine.card.id)).toBe(theirCopiesOfMine + 2)
  })

  it('refuses to cancel once both have confirmed', async () => {
    const { partnerWorkspace, trade, workspace } = await acceptedTrade()
    await workspace.trades.confirm(trade.id)
    await partnerWorkspace.trades.confirm(trade.id)
    await expect(workspace.trades.cancel(trade.id)).rejects.toThrow('This trade is already closed')
  })
})

describe('mock partners confirming', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  async function afterReplyWindow() {
    vi.useFakeTimers()
    const setup = await acceptedTrade(1)
    await setup.workspace.trades.confirm(setup.trade.id)
    vi.setSystemTime(Date.now() + 60_000)
    const thread = await setup.workspace.chat.getThread(setup.trade.chatId)
    return {
      ...setup,
      status: thread?.trades[setup.trade.id]?.status,
    }
  }

  it('confirm accepted Trades after a delay in development, completing them', async () => {
    vi.stubEnv('DEV', true)
    const { myEntry, status } = await afterReplyWindow()
    expect(status).toBe('completed')
    expect((await myEntry())?.quantity).toBe(2)
  })

  it('never confirm on their own outside development', async () => {
    vi.stubEnv('DEV', false)
    const { status } = await afterReplyWindow()
    expect(status).toBe('accepted')
  })
})
