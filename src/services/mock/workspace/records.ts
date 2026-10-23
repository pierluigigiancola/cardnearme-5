import type { BinderItem, BinderItemInput, BinderSection, CollectionEntry, Printing, TradeListType, UserId } from '../../types'
import { games } from '../data'
import { listedItems, priceOf, printingsById, requireTrader } from '../store'
import type { CollectionRecord, ItemRecord, ListRecord } from '../store'

import { clampQuantity, MAX_QUANTITY, now, requirePrinting } from './context'
import type { TraderContext } from './context'

import { checkForTradeQuantity, isHave } from '#/domain'
import { isCondition, isFinish, isLanguage } from '#/lib/cardOptions'

/** Binder and List records of the signed-in Trader, shared by several services. */

/** Ids of the Trader's entries offered in a pending or accepted Trade. */
export function itemsInTrade({ me, store }: TraderContext) {
  const ids = new Set<string>()
  for (const trade of store.trades) {
    if (trade.status !== 'pending' && trade.status !== 'accepted') continue
    if (trade.proposer !== me && trade.recipient !== me) continue
    const mine = trade.proposer === me ? trade.proposerGives : trade.recipientGives
    for (const line of mine) ids.add(line.sourceId)
  }
  return ids
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
  const inTrade = itemsInTrade(ctx)
  return records.flatMap((record): BinderItem[] => {
    const card = printingsById.get(record.cardId)
    if (!card) return []
    const base = {
      card,
      condition: record.condition,
      finish: record.finish,
      id: record.id,
      inTrade: inTrade.has(record.id),
      language: record.language,
      listId: record.listId,
      price: priceOf(card, record.finish),
      quantity: record.quantity,
      updatedAt: record.updatedAt,
    }
    return [record.kind === 'collection'
      ? {
        ...base,
        forTradeQuantity: record.forTradeQuantity,
        kind: 'collection',
      }
      : {
        ...base,
        kind: 'want',
      }]
  })
}

export function itemsIn(ctx: TraderContext, section: BinderSection) {
  return toBinderItems(ctx, ctx.trader.items.filter(record => inSection(record, section)))
}

/** The Trader's Collection entries. */
export function collectionRecords({ trader }: TraderContext) {
  return trader.items.filter((record): record is CollectionRecord => record.kind === 'collection')
}

/** The Trader's Haves, as Binder entries. */
export function myHaves(ctx: TraderContext) {
  return toBinderItems(ctx, collectionRecords(ctx).filter(isHave))
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

/** Resolves the List an entry goes on, creating a default List when the Trader has none of that type. */
export function resolveList(ctx: TraderContext, type: TradeListType, listId: string | null | undefined, card: Printing) {
  if (listId) {
    const list = requireList(ctx, listId)
    if (list.type !== type) throw new Error(`${list.name} is a ${list.type} list`)
    if (list.gameId && list.gameId !== card.gameId) {
      throw new Error(`${list.name} only accepts ${games.find(game => game.id === list.gameId)?.name ?? list.gameId} cards`)
    }
    return list
  }
  const fallback = ctx.trader.lists.find(list => list.type === type && (!list.gameId || list.gameId === card.gameId))
  if (fallback) return fallback
  const created: ListRecord = {
    createdAt: now(),
    gameId: null,
    id: ctx.id('list'),
    name: type === 'haves' ? 'My haves' : 'My wants',
    type,
    updatedAt: now(),
    visibility: 'public',
  }
  ctx.trader.lists.push(created)
  return created
}

export function touchList({ trader }: TraderContext, listId: string | null) {
  const list = trader.lists.find(candidate => candidate.id === listId)
  if (list) list.updatedAt = now()
}

/**
 * Sets how many copies of a Collection entry are for trade. Copies for trade
 * put the entry on a Haves List (`listId`, else the one it is on, else the
 * default); none for trade takes it off.
 */
export function markForTrade(ctx: TraderContext, record: CollectionRecord, forTradeQuantity: number, listId?: string | null) {
  const checked = checkForTradeQuantity(record.quantity, forTradeQuantity)
  const list = checked > 0 ? resolveList(ctx, 'haves', listId ?? record.listId, requirePrinting(record.cardId)) : null
  touchList(ctx, record.listId)
  record.forTradeQuantity = checked
  record.listId = list?.id ?? null
  touchList(ctx, record.listId)
}

/**
 * Adds Collection entries or Wants. An owned card is recorded once: a
 * Collection entry with the same Printing, finish, condition and language
 * takes the new copies (and their for-trade copies) instead of a second record.
 */
export function addRecords(ctx: TraderContext, inputs: BinderItemInput[]) {
  const touched: ItemRecord[] = []
  for (const input of inputs) {
    const card = requirePrinting(input.printingId)
    if (!isCondition(input.condition) || !isFinish(input.finish) || !isLanguage(input.language)) throw new Error('Invalid card details')
    const quantity = clampQuantity(input.quantity)
    if (input.kind === 'collection') {
      const forTrade = checkForTradeQuantity(quantity, input.forTradeQuantity ?? 0)
      const existing = collectionRecords(ctx).find(record =>
        record.cardId === card.id
        && record.finish === input.finish
        && record.condition === input.condition
        && record.language === input.language)
      const record: CollectionRecord = existing ?? {
        cardId: card.id,
        condition: input.condition,
        finish: input.finish,
        forTradeQuantity: 0,
        id: ctx.id('item'),
        kind: 'collection',
        language: input.language,
        listId: null,
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
    const list = resolveList(ctx, 'wants', input.listId, card)
    const existing = ctx.trader.items.find(record =>
      record.kind === 'want'
      && record.listId === list.id
      && record.cardId === card.id
      && record.finish === input.finish
      && record.condition === input.condition
      && record.language === input.language)
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, MAX_QUANTITY)
      existing.updatedAt = now()
      touched.push(existing)
    }
    else {
      const record: ItemRecord = {
        cardId: card.id,
        condition: input.condition,
        finish: input.finish,
        id: ctx.id('item'),
        kind: 'want',
        language: input.language,
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
