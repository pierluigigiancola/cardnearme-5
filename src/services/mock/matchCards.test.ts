import { describe, expect, it } from 'vitest'

import { cards, printings } from './data'
import { mockServices } from './mockServices'
import { createStore } from './store'
import { workspaceFor } from './workspace'

const { matchCards } = mockServices.catalogue

/** A Card printed in more than one Set, with its Printings. */
function reprinted() {
  for (const card of cards) {
    const own = printings.filter(printing => printing.cardId === card.id)
    if (own.length > 1) return own
  }
  throw new Error('Mock data has no reprinted Card')
}

describe('catalogue.matchCards', () => {
  it('resolves a row by Set code and collector number', async () => {
    const [, second] = reprinted()
    const [match] = await matchCards([{
      name: 'whatever',
      number: second.number,
      setCode: second.setCode.toLowerCase(), 
    }])
    expect(match?.id).toBe(second.id)
  })

  it('resolves a name within the Set given, ignoring case', async () => {
    const [, second] = reprinted()
    const [match] = await matchCards([{
      name: ` ${second.name.toUpperCase()} `,
      number: null,
      setCode: second.setCode, 
    }])
    expect(match?.id).toBe(second.id)
  })

  it('returns one result per row, in order, with null for rows that match nothing', async () => {
    const [first] = reprinted()
    const matches = await matchCards([
      {
        name: 'No Such Card Anywhere',
        number: null,
        setCode: null, 
      },
      {
        name: first.name,
        number: first.number,
        setCode: first.setCode, 
      },
    ])
    expect(matches.map(match => match?.id ?? null)).toEqual([null, first.id])
  })

  it('matches only within the Game asked for, and prefers the given Games otherwise', async () => {
    const shared = cards.find(card => cards.some(other => other.name === card.name && other.gameId !== card.gameId))
    if (!shared) throw new Error('Mock data has no name shared across Games')
    const other = cards.find(card => card.name === shared.name && card.gameId !== shared.gameId)
    if (!other) throw new Error('unreachable')
    const row = {
      name: shared.name,
      number: null,
      setCode: null, 
    }
    const [inGame] = await matchCards([row], { gameId: other.gameId })
    const [preferred] = await matchCards([row], { preferGames: [other.gameId] })
    expect(inGame?.cardId).toBe(other.id)
    expect(preferred?.cardId).toBe(other.id)
  })
})

describe('Binder import matching', () => {
  it('resolves rows the way catalogue.matchCards does and leaves unmatched rows out', async () => {
    const [, second] = reprinted()
    const workspace = workspaceFor({
      id: 'match-owner',
      onboarded: true,
      username: 'matcher', 
    }, createStore())
    const base = {
      condition: null,
      finish: 'nonfoil',
      language: null,
      quantity: 1,
      raw: '', 
    } as const
    const draft = await workspace.binder.createImport({
      listId: null,
      rows: [
        {
          ...base,
          line: 1,
          name: 'ignored',
          number: second.number,
          setCode: second.setCode, 
        },
        {
          ...base,
          line: 2,
          name: 'No Such Card Anywhere',
          number: null,
          setCode: null, 
        },
      ],
      section: 'collection',
      source: 'text',
    })
    expect(draft.rows.map(row => [row.card?.id ?? null, row.include])).toEqual([[second.id, true], [null, false]])
  })
})
