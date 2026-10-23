import type { BinderItem, BinderItemInput, BinderSection, CollectionEntry, Printing, TradeListType, UserId, WantFilters } from '../../types'
import { cities, games } from '../data'
import { listedItems, priceOf, printingsById, printingsOf, requireTrader, shownPrinting, wantDetails } from '../store'
import type { CollectionRecord, ItemRecord, ListRecord, TraderRecord, WantRecord } from '../store'

import { clampQuantity, MAX_QUANTITY, now, requirePrinting } from './context'
import type { TraderContext } from './context'

import { checkForTradeQuantity, checkWantFilters, isCondition, isFinish, isHave, isLanguage, reservedQuantities } from '#/domain'
import type { MatchTrader } from '#/domain'

/** Binder and List records of the signed-in Trader, shared by several services. */

/** Copies of the Trader's Collection entries reserved by accepted Trades, by entry id. */
export function myReserved({ me, store }: TraderContext) {
  return reservedQuantities(store.trades, me)
}

/** True when a record shows in a Binder tab: `haves` is the Collection entries with copies for trade. */
export function inSection(record: ItemRecord, section: BinderSection) {
  switch (section) {
    case 'collection': return record.kind === 'collection'
    case 'haves': return record.kind === 'collection' && isHave(record)
    case 'wants': return record.kind === 'want'
  }
}

/** The List type an entry kind lives on: Collection entries on Haves Lists, Wants on Wants Lists. */
export function listTypeOf(record: Pick<ItemRecord, 'kind'>): TradeListType {
  return record.kind === 'collection' ? 'haves' : 'wants'
}

export function toBinderItems(ctx: TraderContext, records: CollectionRecord[]): CollectionEntry[]
export function toBinderItems(ctx: TraderContext, records: ItemRecord[]): BinderItem[]
export function toBinderItems(ctx: TraderContext, records: ItemRecord[]): BinderItem[] {
  const reserved = myReserved(ctx)
  return records.flatMap((record): BinderItem[] => {
    const card = printingOf(record)
    if (!card) return []
    const base = {
      card,
      id: record.id,
      listId: record.listId,
      quantity: record.quantity,
      updatedAt: record.updatedAt,
    }
    return [record.kind === 'collection'
      ? {
        ...base,
        condition: record.condition,
        finish: record.finish,
        forTradeQuantity: record.forTradeQuantity,
        kind: 'collection',
        language: record.language,
        price: priceOf(card, record.finish),
        reservedQuantity: Math.min(record.quantity, reserved.get(record.id) ?? 0),
      }
      : {
        ...base,
        cardId: record.cardId,
        filters: record.filters,
        kind: 'want',
        price: wantDetails(record, card).price,
      }]
  })
}

/** The Printing a record shows: the one owned, or the one shown for a Want. */
export function printingOf(record: ItemRecord) {
  return record.kind === 'collection' ? printingsById.get(record.printingId) : shownPrinting(record)
}

export function itemsIn(ctx: TraderContext, section: BinderSection) {
  return toBinderItems(ctx, ctx.trader.items.filter(record => inSection(record, section)))
}

/** The Trader's Collection entries. */
export function collectionRecords({ trader }: TraderContext) {
  return trader.items.filter((record): record is CollectionRecord => record.kind === 'collection')
}

/** The Trader's Wants. */
export function wantRecords({ trader }: TraderContext) {
  return trader.items.filter((record): record is WantRecord => record.kind === 'want')
}

/** The Trader's Haves, as Binder entries. */
export function myHaves(ctx: TraderContext) {
  return toBinderItems(ctx, collectionRecords(ctx).filter(isHave))
}

/** A Trader as the domain's Matching rule reads them (`#/domain` `MatchTrader`). */
export function matchTraderOf(trader: TraderRecord): MatchTrader {
  return {
    citySlug: trader.profile.citySlug,
    haves: trader.items.flatMap((record) => {
      if (record.kind !== 'collection') return []
      const printing = printingsById.get(record.printingId)
      return printing
        ? [{
          ...record,
          cardId: printing.cardId,
          setCode: printing.setCode,
        }]
        : []
    }),
    id: trader.id,
    lists: trader.lists,
    storeSlugs: trader.profile.storeSlugs,
    wants: trader.items.filter((record): record is WantRecord => record.kind === 'want'),
  }
}

/** The City a Trader picked, if any. */
export function cityOf(trader: TraderRecord) {
  return cities.find(city => city.slug === trader.profile.citySlug) ?? null
}

/** Another Trader's Haves or Wants, as other Traders see them. */
export function partnerItems({ store }: TraderContext, partner: UserId, listType: TradeListType) {
  return listedItems(store, listType, requireTrader(store, partner))
}

export function requireList({ trader }: TraderContext, listId: string) {
  const list = trader.lists.find(candidate => candidate.id === listId)
  if (!list) throw new Error('List not found')
  return list
}

export function requireItem({ trader }: TraderContext, itemId: string) {
  const record = trader.items.find(candidate => candidate.id === itemId)
  if (!record) throw new Error('Card not found in your binder')
  return record
}

/** A new default List: public and open to every game. */
export function newDefaultList(id: string, type: TradeListType, createdAt: string): ListRecord {
  return {
    createdAt,
    gameId: null,
    id,
    isDefault: true,
    name: type === 'haves' ? 'My haves' : 'My wants',
    type,
    updatedAt: createdAt,
    visibility: 'public',
  }
}

/** The Trader's default Haves or Wants List, created if their records predate it. */
export function defaultList(ctx: TraderContext, type: TradeListType) {
  const existing = ctx.trader.lists.find(list => list.type === type && list.isDefault)
  if (existing) return existing
  const created = newDefaultList(ctx.id('list'), type, now())
  ctx.trader.lists.push(created)
  return created
}

/** Resolves the List an entry goes on: the one asked for, else the default List of that type. */
export function resolveList(ctx: TraderContext, type: TradeListType, listId: string | null | undefined, card: Printing) {
  if (!listId) return defaultList(ctx, type)
  const list = requireList(ctx, listId)
  if (list.type !== type) throw new Error(`${list.name} is a ${list.type} list`)
  if (list.gameId && list.gameId !== card.gameId) {
    throw new Error(`${list.name} only accepts ${games.find(game => game.id === list.gameId)?.name ?? list.gameId} cards`)
  }
  return list
}

export function touchList({ trader }: TraderContext, listId: string) {
  const list = trader.lists.find(candidate => candidate.id === listId)
  if (list) list.updatedAt = now()
}

/**
 * Sets how many copies of a Collection entry are for trade, optionally moving
 * it to the Haves List `listId`. The entry always stays on a Haves List; with
 * no copies for trade it is not a Have there.
 */
export function markForTrade(ctx: TraderContext, record: CollectionRecord, forTradeQuantity: number, listId?: string | null) {
  const checked = checkForTradeQuantity(record.quantity, forTradeQuantity)
  const list = resolveList(ctx, 'haves', listId ?? record.listId, requirePrinting(record.printingId))
  touchList(ctx, record.listId)
  record.forTradeQuantity = checked
  record.listId = list.id
  touchList(ctx, record.listId)
}

function sameFilters(a: WantFilters, b: WantFilters) {
  return a.setCode === b.setCode && a.finish === b.finish && a.language === b.language && a.minCondition === b.minCondition
}

/**
 * Adds Collection entries or Wants. An owned card is recorded once: a
 * Collection entry with the same Printing, finish, condition and language
 * takes the new copies (and their for-trade copies) instead of a second record.
 * A Want targets a Card; one with the same Card and filters on the same List
 * takes the new copies.
 */
export function addRecords(ctx: TraderContext, inputs: BinderItemInput[]) {
  const touched: ItemRecord[] = []
  for (const input of inputs) {
    const quantity = clampQuantity(input.quantity)
    if (input.kind === 'collection') {
      const card = requirePrinting(input.printingId)
      if (!isCondition(input.condition) || !isFinish(input.finish) || !isLanguage(input.language)) throw new Error('Invalid card details')
      const forTrade = checkForTradeQuantity(quantity, input.forTradeQuantity ?? 0)
      const existing = collectionRecords(ctx).find(record =>
        record.printingId === card.id
        && record.finish === input.finish
        && record.condition === input.condition
        && record.language === input.language)
      const record: CollectionRecord = existing ?? {
        condition: input.condition,
        finish: input.finish,
        forTradeQuantity: 0,
        id: ctx.id('item'),
        kind: 'collection',
        language: input.language,
        listId: resolveList(ctx, 'haves', input.listId, card).id,
        printingId: card.id,
        quantity: 0,
        updatedAt: now(),
      }
      if (!existing) ctx.trader.items.push(record)
      record.quantity = Math.min(record.quantity + quantity, MAX_QUANTITY)
      record.updatedAt = now()
      markForTrade(ctx, record, Math.min(record.forTradeQuantity + forTrade, record.quantity), forTrade > 0 ? input.listId : undefined)
      touched.push(record)
      continue
    }
    const filters = checkWantFilters(printingsOf(input.cardId), input.filters)
    const shown = shownPrinting({
      cardId: input.cardId,
      filters,
    })
    if (!shown) throw new Error('Card not found')
    const list = resolveList(ctx, 'wants', input.listId, shown)
    const existing = wantRecords(ctx).find(record =>
      record.listId === list.id
      && record.cardId === input.cardId
      && sameFilters(record.filters, filters))
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, MAX_QUANTITY)
      existing.updatedAt = now()
      touched.push(existing)
    }
    else {
      const record: WantRecord = {
        cardId: input.cardId,
        filters,
        id: ctx.id('item'),
        kind: 'want',
        listId: list.id,
        quantity,
        updatedAt: now(),
      }
      ctx.trader.items.push(record)
      touched.push(record)
    }
    touchList(ctx, list.id)
  }
  return touched
}
