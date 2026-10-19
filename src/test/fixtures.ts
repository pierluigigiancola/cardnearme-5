import type { Card } from '#/services/types'

/** A complete `Card` for unit tests; pass only the fields the test cares about. */
export function makeCard(overrides: Partial<Card> = {}): Card {
  const name = overrides.name ?? 'Test Card'
  return {
    artist: 'Test Artist',
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
