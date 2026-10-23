import type { Printing, Facet, FacetSelection, SortOrder, TradeItem } from '../types'

import { games, sets } from './data'

import { conditionLabels, languageLabels } from '#/lib/cardOptions'

// ---------------------------------------------------------------------------
// Facet helpers
// ---------------------------------------------------------------------------

export interface FacetDefinition<T> {
  key: string
  label: string
  values: (item: T) => string[]
  labelFor?: (value: string) => string
}

export function matchesFacets<T>(item: T, definitions: FacetDefinition<T>[], selection: FacetSelection = {}) {
  return definitions.every((definition) => {
    const selected = selection[definition.key]
    if (!selected || selected.length === 0) return true
    return definition.values(item).some(value => selected.includes(value))
  })
}

export function buildFacets<T>(items: T[], definitions: FacetDefinition<T>[]): Facet[] {
  return definitions.map((definition) => {
    const counts = new Map<string, number>()
    for (const item of items) {
      for (const value of definition.values(item)) {
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
    }
    return {
      buckets: [...counts.entries()]
        .map(([value, count]) => ({
          count,
          label: definition.labelFor?.(value) ?? value,
          value,
        }))
        .sort((a, b) => b.count - a.count),
      key: definition.key,
      label: definition.label,
    }
  })
}

export function compare(a: string | number, b: string | number, order: SortOrder = 'asc') {
  const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
  return order === 'asc' ? result : -result
}

export function matchesText(value: string, q?: string) {
  return !q || value.toLowerCase().includes(q.trim().toLowerCase())
}

/** Label for a facet value, falling back to the raw value. */
export function labelFrom(labels: Partial<Record<string, string>>, value: string) {
  return labels[value] ?? value
}

export const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
export const baseType = (card: Printing) => card.typeLine.split(' — ')[0] ?? card.typeLine
export const rarityOrder = ['common', 'uncommon', 'rare', 'mythic', 'special']
export const colorLabels: Record<string, string> = {
  B: 'Black',
  C: 'Colorless',
  G: 'Green',
  R: 'Red',
  U: 'Blue',
  W: 'White',
}

export const cardFacets: FacetDefinition<Printing>[] = [
  {
    key: 'rarity',
    label: 'Rarity',
    labelFor: capitalise,
    values: card => [card.rarity],
  },
  {
    key: 'type',
    label: 'Types',
    values: card => [baseType(card)],
  },
  {
    key: 'finish',
    label: 'Finishes',
    labelFor: capitalise,
    values: card => card.finishes,
  },
  {
    key: 'color',
    label: 'Colors',
    labelFor: value => colorLabels[value] ?? value,
    values: card => card.colors,
  },
  {
    key: 'artist',
    label: 'Artist',
    values: card => [card.artist],
  },
]

export const tradeItemFacets: FacetDefinition<TradeItem>[] = [
  {
    key: 'game',
    label: 'Games',
    labelFor: value => games.find(game => game.id === value)?.name ?? value,
    values: item => [item.card.gameId],
  },
  {
    key: 'set',
    label: 'Sets',
    labelFor: value => sets.find(set => set.code === value)?.name ?? value,
    values: item => [item.card.setCode],
  },
  {
    key: 'condition',
    label: 'Condition',
    labelFor: value => labelFrom(conditionLabels, value),
    values: item => [item.condition],
  },
  {
    key: 'language',
    label: 'Language',
    labelFor: value => labelFrom(languageLabels, value),
    values: item => [item.language],
  },
  {
    key: 'finish',
    label: 'Finishes',
    labelFor: capitalise,
    values: item => [item.finish],
  },
  {
    key: 'rarity',
    label: 'Rarity',
    labelFor: capitalise,
    values: item => [item.card.rarity],
  },
]
