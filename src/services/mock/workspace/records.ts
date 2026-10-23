import type { BinderItem, BinderItemInput, BinderSection, Printing, TradeListType, UserId } from '../../types'
import { games } from '../data'
import { printingsById, listedItems, priceOf, requireTrader } from '../store'
import type { ItemRecord, ListRecord } from '../store'

import { clampQuantity, MAX_QUANTITY, now, requirePrinting } from './context'
import type { TraderContext } from './context'

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

export function toBinderItems(ctx: TraderContext, records: ItemRecord[]): BinderItem[] {
  const inTrade = itemsInTrade(ctx)
  const listedCards = new Set(ctx.trader.items.filter(record => record.section === 'haves').map(record => record.cardId))
  return records.flatMap((record) => {
    const card = printingsById.get(record.cardId)
    if (!card) return []
    return [{
      card,
      condition: record.condition,
      finish: record.finish,
      id: record.id,
      inTrade: inTrade.has(record.id),
      language: record.language,
      listId: record.listId,
      listed: record.section === 'collection' && listedCards.has(record.cardId),
      price: priceOf(card, record.finish),
      quantity: record.quantity,
      section: record.section,
      updatedAt: record.updatedAt,
    }]
  })
}

export function itemsIn(ctx: TraderContext, section: BinderSection) {
  return toBinderItems(ctx, ctx.trader.items.filter(record => record.section === section))
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

/** Resolves the list an item goes to, creating a default list when the Trader has none. */
export function resolveList(ctx: TraderContext, section: BinderSection, listId: string | null | undefined, card: Printing) {
  if (section === 'collection') return null
  if (listId) {
    const list = requireList(ctx, listId)
    if (list.type !== section) throw new Error(`${list.name} is a ${list.type} list`)
    if (list.gameId && list.gameId !== card.gameId) {
      throw new Error(`${list.name} only accepts ${games.find(game => game.id === list.gameId)?.name ?? list.gameId} cards`)
    }
    return list
  }
  const fallback = ctx.trader.lists.find(list => list.type === section && (!list.gameId || list.gameId === card.gameId))
  if (fallback) return fallback
  const created: ListRecord = {
    createdAt: now(),
    gameId: null,
    id: ctx.id('list'),
    name: section === 'haves' ? 'My haves' : 'My wants',
    type: section,
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

/** Adds entries to the Binder, merging into an identical entry when there is one. */
export function addRecords(ctx: TraderContext, inputs: BinderItemInput[]) {
  const touched: ItemRecord[] = []
  for (const input of inputs) {
    const card = requirePrinting(input.printingId)
    if (!isCondition(input.condition) || !isFinish(input.finish) || !isLanguage(input.language)) throw new Error('Invalid card details')
    const quantity = clampQuantity(input.quantity)
    const list = resolveList(ctx, input.section, input.listId, card)
    const existing = ctx.trader.items.find(record =>
      record.section === input.section
      && record.listId === (list?.id ?? null)
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
        language: input.language,
        listId: list?.id ?? null,
        quantity,
        section: input.section,
        updatedAt: now(),
      }
      ctx.trader.items.push(record)
      touched.push(record)
    }
    touchList(ctx, list?.id ?? null)
  }
  return touched
}
