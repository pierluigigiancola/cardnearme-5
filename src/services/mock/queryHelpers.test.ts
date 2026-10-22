import { describe, expect, it } from 'vitest'

import type { FacetDefinition } from './queryHelpers'
import { buildFacets, cardFacets, matchesFacets } from './queryHelpers'

import { makeCard } from '#/test/fixtures'

interface Item {
  colors: string[]
  rarity: string
}

const definitions: FacetDefinition<Item>[] = [
  {
    key: 'rarity',
    label: 'Rarity',
    labelFor: value => value.toUpperCase(),
    values: item => [item.rarity],
  },
  {
    key: 'color',
    label: 'Colors',
    values: item => item.colors,
  },
]

const item = (rarity: string, ...colors: string[]): Item => ({
  colors,
  rarity,
})

describe('matchesFacets', () => {
  const goldRare = item('rare', 'W', 'U')

  it('matches everything without a selection', () => {
    expect(matchesFacets(goldRare, definitions)).toBe(true)
    expect(matchesFacets(goldRare, definitions, {})).toBe(true)
    expect(matchesFacets(goldRare, definitions, {
      color: [],
      rarity: undefined,
    })).toBe(true)
  })

  it('matches when any selected value of a facet applies', () => {
    expect(matchesFacets(goldRare, definitions, { rarity: ['common', 'rare'] })).toBe(true)
    expect(matchesFacets(goldRare, definitions, { rarity: ['common'] })).toBe(false)
  })

  it('matches multi-valued facets on any shared value', () => {
    expect(matchesFacets(goldRare, definitions, { color: ['U'] })).toBe(true)
    expect(matchesFacets(goldRare, definitions, { color: ['B', 'W'] })).toBe(true)
    expect(matchesFacets(goldRare, definitions, { color: ['B', 'R'] })).toBe(false)
  })

  it('requires every selected facet to match', () => {
    expect(matchesFacets(goldRare, definitions, {
      color: ['W'],
      rarity: ['rare'],
    })).toBe(true)
    expect(matchesFacets(goldRare, definitions, {
      color: ['W'],
      rarity: ['common'],
    })).toBe(false)
  })

  it('never matches a selected facet the item has no values for', () => {
    expect(matchesFacets(item('common'), definitions, { color: ['C'] })).toBe(false)
  })

  it('ignores selections for facets it does not define', () => {
    expect(matchesFacets(goldRare, definitions, { artist: ['Nobody'] })).toBe(true)
  })
})

describe('buildFacets', () => {
  const items = [
    item('common', 'R'),
    item('rare', 'W', 'U'),
    item('common', 'U'),
    item('common'),
    item('rare', 'U'),
  ]

  it('counts each value and sorts buckets by count, ties in first-seen order', () => {
    expect(buildFacets(items, definitions)).toEqual([
      {
        buckets: [
          {
            count: 3,
            label: 'COMMON',
            value: 'common',
          },
          {
            count: 2,
            label: 'RARE',
            value: 'rare',
          },
        ],
        key: 'rarity',
        label: 'Rarity',
      },
      {
        buckets: [
          {
            count: 3,
            label: 'U',
            value: 'U',
          },
          {
            count: 1,
            label: 'R',
            value: 'R',
          },
          {
            count: 1,
            label: 'W',
            value: 'W',
          },
        ],
        key: 'color',
        label: 'Colors',
      },
    ])
  })

  it('returns one empty facet per definition when there are no items', () => {
    expect(buildFacets([], definitions)).toEqual([
      {
        buckets: [],
        key: 'rarity',
        label: 'Rarity',
      },
      {
        buckets: [],
        key: 'color',
        label: 'Colors',
      },
    ])
  })

  it('labels card facets with the built-in definitions', () => {
    const cards = [
      makeCard({
        artist: 'Rebecca Guay',
        colors: ['W', 'U'],
        finishes: ['nonfoil', 'foil'],
        name: 'One',
        rarity: 'mythic',
        typeLine: 'Legendary Creature — Angel',
      }),
      makeCard({
        artist: 'Rebecca Guay',
        colors: ['U'],
        finishes: ['foil'],
        name: 'Two',
        rarity: 'mythic',
        typeLine: 'Instant',
      }),
    ]
    const facets = buildFacets(cards, cardFacets)
    const buckets = (key: string) => (facets.find(facet => facet.key === key)?.buckets ?? [])
      .map(bucket => [bucket.label, bucket.count])
    expect(facets.map(facet => facet.key)).toEqual(['rarity', 'type', 'finish', 'color', 'artist'])
    expect(buckets('rarity')).toEqual([['Mythic', 2]])
    expect(buckets('type')).toEqual([['Legendary Creature', 1], ['Instant', 1]])
    expect(buckets('finish')).toEqual([['Foil', 2], ['Nonfoil', 1]])
    expect(buckets('color')).toEqual([['Blue', 2], ['White', 1]])
    expect(buckets('artist')).toEqual([['Rebecca Guay', 2]])
  })
})
