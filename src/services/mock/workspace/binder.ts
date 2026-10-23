import type { BinderService } from '../../services'
import type { BinderImport, BinderItem, BinderItemInput, BinderSection, Ownership } from '../../types'
import { printings, games } from '../data'
import { matchCards } from '../matchCards'
import { baseType, buildFacets, capitalise, compare, labelFrom, matchesFacets, matchesText } from '../queryHelpers'
import type { FacetDefinition } from '../queryHelpers'
import { printingsById } from '../store'
import type { ItemRecord } from '../store'

import { cardKey, clampQuantity, now, requirePrinting } from './context'
import type { TraderContext } from './context'
import { addRecords, checkWantFilters, inSection, listTypeOf, markForTrade, printingOf, requireItem, requireList, resolveList, toBinderItems, touchList } from './records'

import { conditionLabels, isCondition, isLanguage, languageLabels } from '#/lib/cardOptions'

/** Copies a record counts for in a Binder tab: owned, for trade, or wanted. */
function copiesIn(record: Pick<ItemRecord, 'kind' | 'quantity'> & { forTradeQuantity?: number }, section: BinderSection) {
  if (section === 'haves') return record.kind === 'collection' ? record.forTradeQuantity ?? 0 : 0
  return (section === 'wants') === (record.kind === 'want') ? record.quantity : 0
}

/** A Want facet value for an unset filter. */
const ANY = 'any'
const orAny = (label: (value: string) => string) => (value: string) => (value === ANY ? 'Any' : label(value))

const binderFacets: FacetDefinition<BinderItem>[] = [
  {
    key: 'game',
    label: 'Games',
    labelFor: value => games.find(game => game.id === value)?.name ?? value,
    values: item => [item.card.gameId],
  },
  {
    key: 'set',
    label: 'Sets',
    labelFor: orAny(value => printings.find(card => card.setCode === value)?.setName ?? value),
    values: item => [item.kind === 'collection' ? item.card.setCode : item.filters.setCode ?? ANY],
  },
  {
    key: 'condition',
    label: 'Condition',
    labelFor: orAny(value => labelFrom(conditionLabels, value)),
    values: item => [item.kind === 'collection' ? item.condition : item.filters.minCondition ?? ANY],
  },
  {
    key: 'language',
    label: 'Language',
    labelFor: orAny(value => labelFrom(languageLabels, value)),
    values: item => [item.kind === 'collection' ? item.language : item.filters.language ?? ANY],
  },
  {
    key: 'finish',
    label: 'Finishes',
    labelFor: orAny(capitalise),
    values: item => [item.kind === 'collection' ? item.finish : item.filters.finish ?? ANY],
  },
  {
    key: 'rarity',
    label: 'Rarity',
    labelFor: capitalise,
    values: item => [item.card.rarity],
  },
]

/** Extra facets of the Collection section. */
const collectionFacets: FacetDefinition<BinderItem>[] = [
  {
    key: 'trade',
    label: 'Reserved',
    labelFor: value => (value === 'reserved' ? 'Reserved by a trade' : 'Not reserved'),
    values: item => [item.kind === 'collection' && item.reservedQuantity > 0 ? 'reserved' : 'free'],
  },
  {
    key: 'for-trade',
    label: 'For trade',
    labelFor: value => (value === 'for-trade' ? 'For trade' : 'Not for trade'),
    values: item => [item.kind === 'collection' && item.forTradeQuantity > 0 ? 'for-trade' : 'not-for-trade'],
  },
  ...binderFacets,
  {
    key: 'type',
    label: 'Types',
    values: item => [baseType(item.card)],
  },
  {
    key: 'artist',
    label: 'Artist',
    values: item => [item.card.artist],
  },
]

export function binderService(ctx: TraderContext): BinderService {
  const { trader } = ctx

  const requireImport = (importId: string) => {
    const draft = trader.imports.find(candidate => candidate.id === importId)
    if (!draft) throw new Error('Import not found')
    return draft
  }

  return {
    addItems: async (inputs) => {
      const ids = new Set(addRecords(ctx, inputs).map(record => record.id))
      return toBinderItems(ctx, trader.items.filter(record => ids.has(record.id)))
    },
    commitImport: async (importId) => {
      const draft = requireImport(importId)
      if (draft.committedAt) throw new Error('This import was already confirmed')
      const rows = draft.rows.filter(row => row.include && row.card)
      addRecords(ctx, rows.flatMap((row): BinderItemInput[] => {
        if (!row.card) return []
        // Importing Wants creates Wants for the row's Card, any printing, narrowed only by a condition or language the row states.
        if (draft.section === 'wants') {
          return [{
            cardId: row.card.cardId,
            filters: {
              language: row.language,
              minCondition: row.condition,
            },
            kind: 'want',
            listId: draft.listId,
            quantity: row.quantity,
          }]
        }
        return [{
          condition: row.condition ?? 'NM',
          finish: row.card.finishes.includes(row.finish) ? row.finish : 'nonfoil',
          // Importing Haves creates Collection entries with every imported copy for trade.
          forTradeQuantity: draft.section === 'haves' ? row.quantity : 0,
          kind: 'collection',
          language: row.language ?? 'en',
          listId: draft.listId,
          printingId: row.card.id,
          quantity: row.quantity,
        }]
      }))
      draft.committedAt = now()
      draft.importedCount = rows.reduce((total, row) => total + row.quantity, 0)
      return draft
    },
    createImport: async (input) => {
      if (input.rows.length === 0) throw new Error('Nothing to import')
      if (input.section !== 'collection' && input.listId) requireList(ctx, input.listId)
      const rows = input.rows.slice(0, 1000)
      const matches = matchCards(rows, { preferGames: trader.profile.games })
      const draft: BinderImport = {
        committedAt: null,
        createdAt: now(),
        id: ctx.id('import'),
        importedCount: 0,
        listId: input.section === 'collection' ? null : input.listId,
        rows: rows.map((row, index) => {
          const card = matches[index] ?? null
          return {
            ...row,
            card,
            include: card !== null,
            quantity: clampQuantity(row.quantity),
          }
        }),
        section: input.section,
        source: input.source,
      }
      trader.imports.push(draft)
      return draft
    },
    getCounts: async () => {
      const counts = {
        collection: 0,
        haves: 0,
        wants: 0,
      }
      for (const record of trader.items) {
        for (const section of ['collection', 'haves', 'wants'] as const) counts[section] += copiesIn(record, section)
      }
      return counts
    },
    getImport: async importId => trader.imports.find(draft => draft.id === importId) ?? null,
    getOwnership: async (printingIds) => {
      const result: Partial<Record<string, Ownership>> = {}
      for (const printingId of printingIds) {
        const card = printingsById.get(printingId)
        if (!card) continue
        const ownership: Ownership = {
          collection: 0,
          haves: 0,
          wants: 0,
        }
        for (const record of trader.items) {
          const other = printingOf(record)
          if (!other || cardKey(other) !== cardKey(card)) continue
          for (const section of ['collection', 'haves', 'wants'] as const) ownership[section] += copiesIn(record, section)
        }
        result[printingId] = ownership
      }
      return result
    },
    listItems: async ({ facets, listId, order = 'desc', q, section, sort = 'updated' }) => {
      const scoped = toBinderItems(ctx, trader.items.filter(record => inSection(record, section) && (!listId || record.listId === listId)))
      const definitions = section === 'collection' ? collectionFacets : binderFacets
      const filtered = scoped
        .filter(item => matchesText(`${item.card.name} ${item.card.setName}`, q) && matchesFacets(item, definitions, facets))
        .sort((a, b) => {
          switch (sort) {
            case 'name': return compare(a.card.name, b.card.name, order)
            case 'price': return compare(a.price, b.price, order)
            case 'quantity': return compare(a.quantity, b.quantity, order)
            case 'updated': return compare(a.updatedAt, b.updatedAt, order)
          }
        })
      return {
        facets: buildFacets(scoped, definitions),
        items: filtered,
        stats: {
          cards: scoped.reduce((total, item) => total + copiesIn(item, section), 0),
          distinct: scoped.length,
          marketValue: Math.round(scoped.reduce((total, item) => total + item.price * copiesIn(item, section), 0) * 100) / 100,
        },
        total: filtered.length,
      }
    },
    moveItems: async (itemIds, target) => {
      // Resolve every destination first so a rejected card leaves the whole selection untouched.
      const moves = itemIds.map((itemId) => {
        const record = requireItem(ctx, itemId)
        if (target.listId === null && record.kind === 'want') throw new Error('Wants always belong to a Wants List')
        return {
          list: target.listId === null ? null : resolveList(ctx, listTypeOf(record), target.listId, requirePrinting(printingOf(record)?.id ?? '')),
          record,
        }
      })
      for (const { list, record } of moves) {
        if (record.kind === 'collection') {
          // On a Haves List a Collection entry is a Have: keep its for-trade copies, or mark them all.
          markForTrade(ctx, record, list ? record.forTradeQuantity || record.quantity : 0, list?.id)
        }
        else if (list) {
          touchList(ctx, record.listId)
          record.listId = list.id
          touchList(ctx, record.listId)
        }
        record.updatedAt = now()
      }
    },
    removeItems: async (itemIds) => {
      const ids = new Set(itemIds)
      for (const record of trader.items) {
        if (ids.has(record.id)) touchList(ctx, record.listId)
      }
      trader.items = trader.items.filter(record => !ids.has(record.id))
    },
    updateImportRow: async (importId, line, patch) => {
      const draft = requireImport(importId)
      if (draft.committedAt) throw new Error('This import was already confirmed')
      const row = draft.rows.find(candidate => candidate.line === line)
      if (!row) throw new Error('Row not found')
      if (patch.printingId) {
        row.card = requirePrinting(patch.printingId)
        row.include = true
      }
      if (patch.include !== undefined) row.include = patch.include && row.card !== null
      return draft
    },
    updateItem: async (itemId, patch) => {
      const record = requireItem(ctx, itemId)
      if (patch.quantity !== undefined) record.quantity = clampQuantity(patch.quantity)
      if (record.kind === 'collection') {
        if (patch.filters !== undefined) throw new Error('Only Wants have filters')
        const card = requirePrinting(record.printingId)
        if (patch.condition !== undefined) {
          if (!isCondition(patch.condition)) throw new Error('Invalid condition')
          record.condition = patch.condition
        }
        if (patch.finish !== undefined) {
          if (!card.finishes.includes(patch.finish)) throw new Error(`${card.name} has no ${patch.finish} printing`)
          record.finish = patch.finish
        }
        if (patch.language !== undefined) {
          if (!isLanguage(patch.language)) throw new Error('Invalid language')
          record.language = patch.language
        }
        // Fewer copies owned than for trade leaves every remaining copy for trade.
        const forTrade = patch.forTradeQuantity ?? Math.min(record.forTradeQuantity, record.quantity)
        markForTrade(ctx, record, forTrade, patch.listId)
      }
      else {
        if (patch.forTradeQuantity !== undefined) throw new Error('Only cards you own can be marked for trade')
        if (patch.condition !== undefined || patch.finish !== undefined || patch.language !== undefined) {
          throw new Error('A Want is narrowed by its filters')
        }
        if (patch.filters !== undefined) {
          record.filters = checkWantFilters(record.cardId, {
            ...record.filters,
            ...patch.filters,
          })
        }
        const shown = requirePrinting(printingOf(record)?.id ?? '')
        if (patch.listId) record.listId = resolveList(ctx, 'wants', patch.listId, shown).id
        touchList(ctx, record.listId)
      }
      record.updatedAt = now()
      const item = toBinderItems(ctx, [record]).at(0)
      if (!item) throw new Error('Card not found')
      return item
    },
  }
}
