import { describe, expect, it } from 'vitest'

import { findMatches } from './matching'
import type { MatchTrader } from './matching'
import { ANY_PRINTING } from './want'

const PUBLIC_HAVES = 'haves'
const PRIVATE_HAVES = 'haves-private'
const PUBLIC_WANTS = 'wants'
const PRIVATE_WANTS = 'wants-private'

function have(id: string, cardId: string, overrides: Partial<MatchTrader['haves'][number]> = {}): MatchTrader['haves'][number] {
  return {
    cardId,
    condition: 'NM',
    finish: 'nonfoil',
    forTradeQuantity: 1,
    id,
    language: 'en',
    listId: PUBLIC_HAVES,
    quantity: 1,
    setCode: 'LEA',
    ...overrides,
  }
}

function want(id: string, cardId: string, overrides: Partial<MatchTrader['wants'][number]> = {}): MatchTrader['wants'][number] {
  return {
    cardId,
    filters: ANY_PRINTING,
    id,
    listId: PUBLIC_WANTS,
    ...overrides,
  }
}

function trader(id: string, overrides: Partial<MatchTrader> = {}): MatchTrader {
  return {
    citySlug: 'milan',
    haves: [],
    id,
    lists: [
      {
        id: PUBLIC_HAVES,
        visibility: 'public',
      },
      {
        id: PRIVATE_HAVES,
        visibility: 'private',
      },
      {
        id: PUBLIC_WANTS,
        visibility: 'public',
      },
      {
        id: PRIVATE_WANTS,
        visibility: 'private',
      },
    ],
    storeSlugs: [],
    wants: [],
    ...overrides,
  }
}

const ids = (entries: { id: string }[]) => entries.map(entry => entry.id)

describe('Matching (scoped to the City)', () => {
  it('matches another Trader\'s public Have in the City to my Want', () => {
    const me = trader('me', { wants: [want('w1', 'bolt')] })
    const bob = trader('bob', { haves: [have('h1', 'bolt'), have('h2', 'shock')] })

    const matches = findMatches(me, [bob], { citySlug: 'milan' })

    expect(matches.map(match => match.partnerId)).toEqual(['bob'])
    expect(ids(matches[0].theyHave)).toEqual(['h1'])
    expect(matches[0].theyWant).toEqual([])
  })

  it('matches only a Have that meets every filter the Want sets', () => {
    const me = trader('me', {
      wants: [want('w1', 'bolt', {
        filters: {
          ...ANY_PRINTING,
          finish: 'foil',
          minCondition: 'EX',
        },
      })],
    })
    const bob = trader('bob', {
      haves: [
        have('nonfoil', 'bolt'),
        have('foil-played', 'bolt', {
          condition: 'PL',
          finish: 'foil',
        }),
        have('foil-nm', 'bolt', { finish: 'foil' }),
      ],
    })

    expect(ids(findMatches(me, [bob], { citySlug: 'milan' })[0].theyHave)).toEqual(['foil-nm'])
  })

  it('ignores other Traders\' private Lists and entries with no copies for trade', () => {
    const me = trader('me', {
      haves: [have('mine', 'shock')],
      wants: [want('w1', 'bolt')],
    })
    const bob = trader('bob', {
      haves: [
        have('private', 'bolt', { listId: PRIVATE_HAVES }),
        have('off-trade', 'bolt', { forTradeQuantity: 0 }),
      ],
      wants: [want('private-want', 'shock', { listId: PRIVATE_WANTS })],
    })

    expect(findMatches(me, [bob], { citySlug: 'milan' })).toEqual([])
  })

  it('uses all my own Wants, including those on private Lists, and my Haves on any List', () => {
    const me = trader('me', {
      haves: [have('mine', 'shock', { listId: PRIVATE_HAVES })],
      wants: [want('w1', 'bolt', { listId: PRIVATE_WANTS })],
    })
    const bob = trader('bob', {
      haves: [have('h1', 'bolt')],
      wants: [want('bw', 'shock')],
    })

    const [match] = findMatches(me, [bob], { citySlug: 'milan' })
    expect(ids(match.theyHave)).toEqual(['h1'])
    expect(ids(match.theyWant)).toEqual(['mine'])
  })

  it('matches only Traders in the scope\'s City, never myself', () => {
    const me = trader('me', {
      haves: [have('mine', 'bolt')],
      wants: [want('w1', 'bolt')],
    })
    const rome = trader('rome', {
      citySlug: 'rome',
      haves: [have('h1', 'bolt')],
    })
    const noCity = trader('nocity', {
      citySlug: null,
      haves: [have('h2', 'bolt')],
    })
    const milan = trader('milan', { haves: [have('h3', 'bolt')] })
    const everyone = [me, rome, noCity, milan]

    expect(findMatches(me, everyone, { citySlug: 'milan' }).map(match => match.partnerId)).toEqual(['milan'])
    expect(findMatches(me, everyone, { citySlug: 'rome' }).map(match => match.partnerId)).toEqual(['rome'])
  })

  it('narrows the City to a Store\'s Traders when the scope names one', () => {
    const me = trader('me', { wants: [want('w1', 'bolt')] })
    const atStore = trader('at-store', {
      haves: [have('h1', 'bolt')],
      storeSlugs: ['vault'],
    })
    const elsewhere = trader('elsewhere', {
      haves: [have('h2', 'bolt')],
      storeSlugs: ['den'],
    })

    expect(findMatches(me, [atStore, elsewhere], {
      citySlug: 'milan',
      storeSlug: 'vault',
    }).map(match => match.partnerId)).toEqual(['at-store'])
  })

  it('ranks Traders who share my Stores first, then by number of matched cards', () => {
    const me = trader('me', {
      storeSlugs: ['vault'],
      wants: [want('w1', 'bolt'), want('w2', 'shock')],
    })
    const many = trader('many', { haves: [have('m1', 'bolt'), have('m2', 'shock')] })
    const few = trader('few', { haves: [have('f1', 'bolt')] })
    const shared = trader('shared', {
      haves: [have('s1', 'bolt')],
      storeSlugs: ['vault', 'den'],
    })

    const matches = findMatches(me, [few, many, shared], { citySlug: 'milan' })
    expect(matches.map(match => match.partnerId)).toEqual(['shared', 'many', 'few'])
    expect(matches[0].sharedStoreSlugs).toEqual(['vault'])
  })
})
