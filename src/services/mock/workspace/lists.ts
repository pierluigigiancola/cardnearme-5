import type { ListsService } from '../../services'
import type { TradeList, TradeListInput } from '../../types'
import { games } from '../data'
import { compare, matchesText } from '../queryHelpers'
import type { ListRecord } from '../store'

import { now } from './context'
import type { TraderContext } from './context'
import { defaultList, printingOf, requireList } from './records'

export function listsService(ctx: TraderContext): ListsService {
  const { trader } = ctx

  const toList = (list: ListRecord): TradeList => ({
    ...list,
    cardCount: trader.items
      .filter(record => record.listId === list.id)
      .reduce((total, record) => total + (record.kind === 'collection' ? record.forTradeQuantity : record.quantity), 0),
  })

  const validate = (input: Partial<TradeListInput>) => {
    if (input.name !== undefined && !input.name.trim()) throw new Error('Give the list a name')
    if (input.gameId && !games.some(game => game.id === input.gameId)) throw new Error('Unknown game')
  }

  return {
    create: async (input) => {
      validate(input)
      const list: ListRecord = {
        createdAt: now(),
        gameId: input.gameId,
        id: ctx.id('list'),
        isDefault: false,
        name: input.name.trim().slice(0, 60),
        type: input.type === 'wants' ? 'wants' : 'haves',
        updatedAt: now(),
        visibility: input.visibility === 'private' ? 'private' : 'public',
      }
      trader.lists.push(list)
      return toList(list)
    },
    list: async ({ order = 'desc', q, sort = 'updated', type } = {}) => trader.lists
      .filter(list => (!type || list.type === type) && matchesText(list.name, q))
      .map(toList)
      .sort((a, b) => {
        switch (sort) {
          case 'name': return compare(a.name, b.name, order)
          case 'created': return compare(a.createdAt, b.createdAt, order)
          case 'updated': return compare(a.updatedAt, b.updatedAt, order)
        }
      }),
    remove: async (listId) => {
      const list = requireList(ctx, listId)
      if (list.isDefault) throw new Error(`${list.name} is your default ${list.type} list and cannot be deleted`)
      // Its Haves go with it, but the cards stay owned: off trade, on the default Haves List. Its Wants are deleted.
      const fallback = list.type === 'haves' ? defaultList(ctx, 'haves') : null
      for (const record of trader.items) {
        if (record.kind === 'collection' && record.listId === listId && fallback) {
          record.forTradeQuantity = 0
          record.listId = fallback.id
          record.updatedAt = now()
        }
      }
      trader.items = trader.items.filter(record => record.listId !== listId)
      trader.lists = trader.lists.filter(candidate => candidate.id !== listId)
    },
    update: async (listId, patch) => {
      validate(patch)
      const list = requireList(ctx, listId)
      if (patch.type && patch.type !== list.type) throw new Error('A list cannot change between haves and wants')
      if (patch.gameId && list.isDefault) throw new Error('Your default list accepts cards from every game')
      if (patch.gameId) {
        const otherGame = trader.items.some(record => record.listId === listId && printingOf(record)?.gameId !== patch.gameId)
        if (otherGame) throw new Error('The list has cards from other games')
      }
      if (patch.name !== undefined) list.name = patch.name.trim().slice(0, 60)
      if (patch.gameId !== undefined) list.gameId = patch.gameId
      if (patch.visibility !== undefined) list.visibility = patch.visibility === 'private' ? 'private' : 'public'
      list.updatedAt = now()
      return toList(list)
    },
  }
}
