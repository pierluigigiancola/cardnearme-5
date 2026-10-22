import { describe, expect, it } from 'vitest'

import { deckCounts, validateDeck } from './deckValidation'

import type { Card, DeckCard, DeckSection, GameId } from '#/services/types'
import { makeCard } from '#/test/fixtures'

function entry(card: Card, quantity = 1, section: DeckSection = 'mainboard'): DeckCard {
  return {
    card,
    quantity,
    section,
  }
}

const basic = (name: string, legalities: Card['legalities'] = {}) => makeCard({
  legalities,
  name,
  typeLine: 'Basic Land — Island',
})

const messages = (issues: { message: string }[]) => issues.map(issue => issue.message)

describe('deckCounts', () => {
  it('sums quantities per section', () => {
    expect(deckCounts([
      entry(makeCard({ name: 'A' }), 2),
      entry(makeCard({ name: 'B' }), 3),
      entry(makeCard({ name: 'C' }), 1, 'sideboard'),
      entry(makeCard({ name: 'D' }), 1, 'commander'),
      entry(makeCard({ name: 'E' }), 4, 'considering'),
    ])).toEqual({
      commander: 1,
      considering: 4,
      mainboard: 5,
      sideboard: 1,
    })
  })
})

describe('validateDeck: commander', () => {
  const legal = { commander: 'legal' } as const
  const commander = makeCard({
    legalities: legal,
    name: 'Atraxa',
  })
  /** One commander plus `size - 1` cards: 30 distinct singletons and basics for the rest. */
  const commanderDeck = (size = 100): DeckCard[] => [
    entry(commander, 1, 'commander'),
    ...Array.from({ length: 30 }, (_, index) => entry(makeCard({
      legalities: legal,
      name: `Spell ${index}`,
    }))),
    entry(basic('Island', legal), size - 31),
  ]

  it('accepts a legal 100-card singleton deck', () => {
    expect(validateDeck({
      cards: commanderDeck(),
      format: 'Commander',
      gameId: 'mtg',
    })).toEqual([])
  })

  it.each([99, 101])('requires exactly 100 cards (%i)', (size) => {
    expect(messages(validateDeck({
      cards: commanderDeck(size),
      format: 'commander',
      gameId: 'mtg',
    }))).toEqual([`Commander decks have exactly 100 cards (now ${size})`])
  })

  it('counts commanders towards the 100 but not the sideboard or maybeboard', () => {
    const cards = [
      ...commanderDeck(),
      entry(makeCard({
        legalities: legal,
        name: 'Side',
      }), 1, 'sideboard'),
      entry(makeCard({
        legalities: legal,
        name: 'Maybe',
      }), 5, 'considering'),
    ]
    expect(validateDeck({
      cards,
      format: 'commander',
      gameId: 'mtg',
    })).toEqual([])
  })

  it('requires a commander', () => {
    const cards = commanderDeck().filter(card => card.section !== 'commander')
    cards.push(entry(makeCard({
      legalities: legal,
      name: 'Extra',
    })))
    expect(messages(validateDeck({
      cards,
      format: 'commander',
      gameId: 'mtg',
    }))).toEqual(['Choose a commander'])
  })

  it('allows two commanders but not three', () => {
    const partner = (name: string) => entry(makeCard({
      legalities: legal,
      name,
    }), 1, 'commander')
    const two = [...commanderDeck(99), partner('Partner')]
    expect(validateDeck({
      cards: two,
      format: 'commander',
      gameId: 'mtg',
    })).toEqual([])

    const three = [...commanderDeck(98), partner('Partner'), partner('Third')]
    expect(messages(validateDeck({
      cards: three,
      format: 'commander',
      gameId: 'mtg',
    }))).toEqual(['A deck can have at most two commanders'])
  })

  it('allows one copy of each non-basic card, across sections', () => {
    const solRing = makeCard({
      legalities: legal,
      name: 'Sol Ring',
    })
    const cards = [...commanderDeck(99), entry(solRing), entry(solRing, 1, 'sideboard')]
    expect(messages(validateDeck({
      cards,
      format: 'commander',
      gameId: 'mtg',
    }))).toEqual(['Sol Ring: 2 copies (max 1)'])
  })

  it('ignores the maybeboard for copy limits', () => {
    const cards = [...commanderDeck(), entry(commander, 3, 'considering')]
    expect(validateDeck({
      cards,
      format: 'commander',
      gameId: 'mtg',
    })).toEqual([])
  })

  it('only applies singleton rules to Magic', () => {
    const issues = messages(validateDeck({
      cards: [entry(basic('Filler'), 60), entry(makeCard({ name: 'Twice' }), 2)],
      format: 'Commander',
      gameId: 'lorcana',
    }))
    expect(issues).toEqual([])
  })
})

describe('validateDeck: constructed', () => {
  const minimums: [GameId, number][] = [
    ['fab', 60],
    ['fusionworld', 50],
    ['lorcana', 60],
    ['mtg', 60],
    ['onepiece', 50],
    ['riftbound', 40],
    ['swu', 50],
  ]

  it.each(minimums)('needs at least the %s minimum of %i main deck cards', (gameId, minimum) => {
    const legalities = { standard: 'legal' } as const
    expect(validateDeck({
      cards: [entry(basic('Filler', legalities), minimum)],
      format: 'Standard',
      gameId,
    })).toEqual([])
    expect(validateDeck({
      cards: [entry(basic('Filler', legalities), minimum - 1), entry(basic('Side', legalities), 5, 'sideboard')],
      format: 'Standard',
      gameId,
    })).toEqual([{
      level: 'error',
      message: `The main deck needs at least ${minimum} cards (now ${minimum - 1})`,
    }])
  })

  it('caps the sideboard at 15 cards', () => {
    const legalities = { modern: 'legal' } as const
    const deck = (sideboard: number) => validateDeck({
      cards: [entry(basic('Island', legalities), 60), entry(basic('Plains', legalities), sideboard, 'sideboard')],
      format: 'modern',
      gameId: 'mtg',
    })
    expect(deck(15)).toEqual([])
    expect(messages(deck(16))).toEqual(['Sideboards hold up to 15 cards (now 16)'])
  })

  it.each([
    ['mtg', 4],
    ['lorcana', 4],
    ['onepiece', 4],
    ['fusionworld', 4],
    ['fab', 3],
    ['riftbound', 3],
    ['swu', 3],
  ] as [GameId, number][])('limits %s decks to %i copies, counting main deck and sideboard together', (gameId, limit) => {
    const legalities = { standard: 'legal' } as const
    const card = makeCard({
      legalities,
      name: 'Staple',
    })
    const deck = (main: number, side: number) => validateDeck({
      cards: [entry(basic('Filler', legalities), 60), entry(card, main), entry(card, side, 'sideboard')],
      format: 'standard',
      gameId,
    })
    expect(deck(limit - 1, 1)).toEqual([])
    expect(messages(deck(limit, 1))).toEqual([`Staple: ${limit + 1} copies (max ${limit})`])
  })

  it('lets basic lands exceed the copy limit', () => {
    expect(validateDeck({
      cards: [entry(basic('Island', { modern: 'legal' }), 60)],
      format: 'modern',
      gameId: 'mtg',
    })).toEqual([])
  })
})

describe('validateDeck: legality', () => {
  const filler = (format: string) => entry(basic('Island', { [format]: 'legal' }), 60)

  it('flags banned and not-legal cards using the format as written', () => {
    const issues = validateDeck({
      cards: [
        filler('modern'),
        entry(makeCard({
          legalities: { modern: 'banned' },
          name: 'Splinter Twin',
        })),
        entry(makeCard({
          legalities: { modern: 'not_legal' },
          name: 'Black Lotus',
        }), 1, 'sideboard'),
      ],
      format: 'Modern',
      gameId: 'mtg',
    })
    expect(issues).toEqual([
      {
        level: 'error',
        message: 'Splinter Twin is banned in Modern',
      },
      {
        level: 'error',
        message: 'Black Lotus is not legal in Modern',
      },
    ])
  })

  it('allows one copy of a restricted card but not two', () => {
    const lotus = makeCard({
      legalities: { vintage: 'restricted' },
      name: 'Black Lotus',
    })
    expect(validateDeck({
      cards: [filler('vintage'), entry(lotus)],
      format: 'vintage',
      gameId: 'mtg',
    })).toEqual([])
    expect(messages(validateDeck({
      cards: [filler('vintage'), entry(lotus, 2)],
      format: 'vintage',
      gameId: 'mtg',
    }))).toEqual(['Black Lotus is restricted to one copy'])
  })

  // $deckId.tsx keys issues by message, so a repeated message is a duplicate key.
  it('reports a card once when it appears in several sections', () => {
    const twin = makeCard({
      legalities: { modern: 'banned' },
      name: 'Splinter Twin',
    })
    const mystery = makeCard({ name: 'Mystery' })
    expect(messages(validateDeck({
      cards: [filler('modern'), entry(twin, 2), entry(mystery), entry(twin, 2, 'sideboard'), entry(mystery, 1, 'sideboard')],
      format: 'modern',
      gameId: 'mtg',
    }))).toEqual(['Splinter Twin is banned in modern', 'No legality data for Mystery in modern'])

    const lotus = makeCard({
      legalities: { vintage: 'restricted' },
      name: 'Black Lotus',
    })
    expect(messages(validateDeck({
      cards: [filler('vintage'), entry(lotus), entry(lotus, 1, 'sideboard')],
      format: 'vintage',
      gameId: 'mtg',
    }))).toEqual(['Black Lotus is restricted to one copy'])
  })

  it('skips the maybeboard', () => {
    expect(validateDeck({
      cards: [
        filler('modern'),
        entry(makeCard({
          legalities: { modern: 'banned' },
          name: 'Splinter Twin',
        }), 1, 'considering'),
      ],
      format: 'modern',
      gameId: 'mtg',
    })).toEqual([])
  })

  it('warns about missing legality data for Magic only', () => {
    const unknown = entry(makeCard({ name: 'Mystery' }))
    expect(validateDeck({
      cards: [filler('pioneer'), unknown],
      format: 'Pioneer',
      gameId: 'mtg',
    })).toEqual([{
      level: 'warning',
      message: 'No legality data for Mystery in Pioneer',
    }])
    expect(validateDeck({
      cards: [entry(basic('Filler'), 60), unknown],
      format: 'Core',
      gameId: 'lorcana',
    })).toEqual([])
  })

  it('does not read legality from inherited object keys', () => {
    expect(messages(validateDeck({
      cards: [filler('constructor'), entry(makeCard({ name: 'Proto' }))],
      format: 'constructor',
      gameId: 'mtg',
    }))).toEqual(['No legality data for Proto in constructor'])
  })
})
