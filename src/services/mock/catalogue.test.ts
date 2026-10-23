import { describe, expect, it } from 'vitest'

import { cards, printings } from './data'
import { dispatchMockCall } from './dispatch'
import { mockServices } from './mockServices'
import { publicServices } from './public'
import { createStore } from './store'
import { workspaceFor } from './workspace'

/** A Card whose name was printed in more than one Set. */
function reprintedCard() {
  const card = cards.find(candidate => printings.filter(printing => printing.cardId === candidate.id).length > 1)
  if (!card) throw new Error('Mock data has no reprinted Card')
  return card
}

describe('mock catalogue: Card and Printing', () => {
  it('groups the Printings of one name within a Game under one Card', () => {
    const card = reprintedCard()
    const grouped = printings.filter(printing => printing.cardId === card.id)
    expect(new Set(grouped.map(printing => printing.name))).toEqual(new Set([card.name]))
    expect(new Set(grouped.map(printing => printing.gameId))).toEqual(new Set([card.gameId]))
    expect(new Set(grouped.map(printing => printing.setCode)).size).toBe(grouped.length)
  })

  it('gives every Printing a Card that exists', () => {
    const ids = new Set(cards.map(card => card.id))
    expect(printings.filter(printing => !ids.has(printing.cardId))).toEqual([])
  })

  it('keeps the same name in different Games as different Cards', () => {
    const byName = new Map<string, Set<string>>()
    for (const card of cards) byName.set(card.name, (byName.get(card.name) ?? new Set()).add(card.gameId))
    const shared = [...byName.entries()].find(([, gameIds]) => gameIds.size > 1)
    if (!shared) throw new Error('Mock data has no name shared across Games')
    const [name] = shared
    const ids = cards.filter(card => card.name === name).map(card => card.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('lists every Printing of a Card by its id', async () => {
    const card = reprintedCard()
    const listed = await mockServices.catalogue.listPrintings(card.id)
    expect(listed.length).toBeGreaterThan(1)
    expect(listed.every(printing => printing.cardId === card.id && printing.name === card.name)).toBe(true)
  })

  it('lists no Printings for an unknown Card', async () => {
    expect(await mockServices.catalogue.listPrintings('mtg:no-such-card')).toEqual([])
  })
})

describe('Card availability', () => {
  it('counts a public Have of any Printing of the Card', async () => {
    const card = reprintedCard()
    const second = printings.filter(printing => printing.cardId === card.id).at(1)
    if (!second) throw new Error('Expected a second Printing')
    const store = createStore()
    const workspace = workspaceFor({
      id: 'availability-trader',
      onboarded: true,
      username: 'availabilitytester',
    }, store)
    const { citySlug } = await workspace.profile.get()
    const availableIn = async () => {
      const entries = await publicServices(store).catalogue.getCardAvailability(card.id)
      return entries.find(entry => entry.citySlug === citySlug)?.available ?? 0
    }
    const before = await availableIn()

    await workspace.binder.addItems([{
      condition: 'NM',
      finish: 'nonfoil',
      forTradeQuantity: 1,
      kind: 'collection',
      language: 'en',
      printingId: second.id,
      quantity: 1,
    }])

    expect(await availableIn()).toBe(before + 1)
  })

  it('counts Binder copies of any Printing of the same Card', async () => {
    const card = reprintedCard()
    const grouped = printings.filter(printing => printing.cardId === card.id)
    const first = grouped.at(0)
    const second = grouped.at(1)
    if (!first || !second) throw new Error('Expected two Printings')
    const workspace = workspaceFor({
      id: 'ownership-trader',
      onboarded: true,
      username: 'ownershiptester',
    }, createStore())
    const before = (await workspace.binder.getOwnership([first.id]))[first.id]?.collection ?? 0

    await workspace.binder.addItems([{
      condition: 'NM',
      finish: 'nonfoil',
      kind: 'collection',
      language: 'en',
      printingId: second.id,
      quantity: 2,
    }])

    const after = await workspace.binder.getOwnership([first.id])
    expect(after[first.id]?.collection).toBe(before + 2)
  })

  it('is asked for by Card id, not by passing a Printing', async () => {
    const printing = printings.find(candidate => candidate.cardId === reprintedCard().id)
    await expect(dispatchMockCall(createStore(), { kind: 'anonymous' }, {
      args: [printing],
      method: 'getCardAvailability',
      service: 'catalogue',
    })).rejects.toThrow('Invalid arguments')
  })
})
