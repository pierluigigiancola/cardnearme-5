import type { Printing } from '#/services/types'

/** A complete `Printing` for unit tests; pass only the fields the test cares about. */
export function makePrinting(overrides: Partial<Printing> = {}): Printing {
  const name = overrides.name ?? 'Test Card'
  return {
    artist: 'Test Artist',
    cardId: `mtg:${name.toLowerCase().replaceAll(' ', '-')}`,
    colors: [],
    cost: 1,
    finishes: ['nonfoil'],
    flavorText: null,
    gameId: 'mtg',
    id: `card-${name}`,
    legalities: {},
    name,
    number: '1',
    priceChange7d: 0,
    prices: { nonfoil: 1 },
    rarity: 'common',
    rulings: [],
    setCode: 'TST',
    setName: 'Test Set',
    slug: name.toLowerCase().replaceAll(' ', '-'),
    text: '',
    typeLine: 'Creature — Test',
    ...overrides,
  }
}
