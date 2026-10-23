import type { WorkspaceServices } from '../services'

import { args, arrayOf, bool, either, nullable, num, oneOf, optional, recordOf, shape, str } from './checks'
import type { ArgsCheck } from './checks'
import { games } from './data'
import { publicServices } from './public'
import type { StorePublicServices } from './public'
import type { MockStore } from './store'
import { workspaceFor } from './workspace'

import type { Viewer } from '#/auth/viewer'
import { conditions, finishes, languages } from '#/lib/cardOptions'

/**
 * Routes one RPC call to the store-backed mock services. Only the methods
 * listed below can be called, and each call's arguments are checked against
 * the method's signature before the service runs. Workspace methods act for
 * the signed-in viewer; public methods also serve anonymous visitors.
 */

export interface MockCall {
  service: string
  method: string
  args: unknown[]
}

type MethodTable<TService> = { [TMethod in keyof TService]: ArgsCheck }

const gameId = oneOf(...games.map(game => game.id))
const condition = oneOf(...conditions)
const finish = oneOf(...finishes)
const language = oneOf(...languages)
const section = oneOf('collection', 'haves', 'wants')
const listType = oneOf('haves', 'wants')
const order = optional(oneOf('asc', 'desc'))
const visibility = oneOf('public', 'private')
const facets = optional(recordOf(optional(arrayOf(str))))
const ids = arrayOf(str)

const binderItemInput = shape({
  condition,
  finish,
  forTradeQuantity: optional(num),
  kind: oneOf('collection', 'want'),
  language,
  listId: optional(nullable(str)),
  printingId: str,
  quantity: num,
})

const parsedImportRow = shape({
  condition: nullable(condition),
  finish,
  language: nullable(language),
  line: num,
  name: str,
  number: nullable(str),
  quantity: num,
  raw: str,
  setCode: nullable(str),
})

const listInput = {
  gameId: nullable(gameId),
  name: str,
  type: listType,
  visibility,
}

const deckInput = shape({
  cards: arrayOf(shape({
    printingId: str,
    quantity: num,
    section: oneOf('commander', 'mainboard', 'sideboard', 'considering'),
  })),
  description: str,
  format: str,
  gameId,
  name: str,
  visibility,
})

const meetup = nullable(either(
  shape({
    address: str,
    kind: oneOf('store'),
    name: str,
    storeSlug: str,
  }),
  shape({
    address: str,
    kind: oneOf('custom'),
    name: str,
  }),
))

const draftLine = shape({
  price: num,
  quantity: num,
  sourceId: str,
})

const tradeDraft = shape({
  cash: nullable(shape({
    amount: num,
    payer: oneOf('me', 'partner'),
  })),
  get: arrayOf(draftLine),
  give: arrayOf(draftLine),
  meetAt: nullable(str),
  meetup,
  note: str,
  partner: str,
})

const workspaceMethods: { [TName in keyof WorkspaceServices]: MethodTable<WorkspaceServices[TName]> } = {
  binder: {
    addItems: args(arrayOf(binderItemInput)),
    commitImport: args(str),
    createImport: args(shape({
      listId: nullable(str),
      rows: arrayOf(parsedImportRow),
      section,
      source: oneOf('csv', 'text'),
    })),
    getCounts: args(),
    getImport: args(str),
    getOwnership: args(ids),
    listItems: args(shape({
      facets,
      listId: optional(str),
      order,
      q: optional(str),
      section,
      sort: optional(oneOf('name', 'updated', 'price', 'quantity')),
    })),
    moveItems: args(ids, shape({ listId: nullable(str) })),
    removeItems: args(ids),
    updateImportRow: args(str, num, shape({
      include: optional(bool),
      printingId: optional(str),
    })),
    updateItem: args(str, shape({
      condition: optional(condition),
      finish: optional(finish),
      forTradeQuantity: optional(num),
      language: optional(language),
      listId: optional(nullable(str)),
      quantity: optional(num),
    })),
  },
  chat: {
    getThread: args(str),
    listChats: args(),
    markRead: args(str),
    openChat: args(str),
    sendMessage: args(str, str),
  },
  deckBuilder: {
    create: args(deckInput),
    getMine: args(str),
    listMine: args(),
    remove: args(str),
    update: args(str, deckInput),
  },
  lists: {
    create: args(shape(listInput)),
    list: args(optional(shape({
      order,
      q: optional(str),
      sort: optional(oneOf('name', 'created', 'updated')),
      type: optional(listType),
    }))),
    remove: args(str),
    update: args(str, shape(Object.fromEntries(Object.entries(listInput).map(([key, check]) => [key, optional(check)])))),
  },
  notifications: {
    getUnreadCounts: args(),
    list: args(optional(shape({
      kind: optional(oneOf('message', 'trade', 'item-available', 'item-wanted')),
      status: optional(oneOf('unread', 'read')),
    }))),
    markAllRead: args(),
    markRead: args(ids),
  },
  profile: {
    completeOnboarding: args(shape({
      citySlug: str,
      showStoresOnProfile: bool,
      storeSlugs: ids,
    })),
    get: args(),
    joinStore: args(str),
    leaveStore: args(str),
    update: args(shape({
      avatarHue: optional(num),
      bio: optional(str),
      citySlug: optional(nullable(str)),
      displayName: optional(str),
      games: optional(arrayOf(gameId)),
      meetingPlaces: optional(arrayOf(str)),
      pricingSource: optional(oneOf('cardmarket-eur', 'tcgplayer-usd')),
      showStoresOnProfile: optional(bool),
    })),
    updateStoreSettings: args(str, shape({ notifyMatches: bool })),
  },
  trades: {
    accept: args(str),
    cancel: args(str),
    confirm: args(str),
    getContext: args(str),
    listMatches: args(optional(shape({
      citySlug: optional(str),
      storeSlug: optional(str),
    }))),
    propose: args(tradeDraft),
    revise: args(str, tradeDraft),
  },
}

const publicMethods: { [TName in keyof StorePublicServices]: MethodTable<StorePublicServices[TName]> } = {
  catalogue: { getCardAvailability: args(str) },
  community: {
    getDeck: args(str),
    getUser: args(str),
    listDeckComments: args(str),
    listDecks: args(optional(shape({
      format: optional(str),
      gameId: optional(gameId),
      limit: optional(num),
      ownerId: optional(str),
    }))),
  },
  trading: {
    getCityTradeStats: args(str),
    listTradeItems: args(shape({
      citySlug: optional(str),
      facets,
      limit: optional(num),
      listType,
      order,
      ownerId: optional(str),
      q: optional(str),
      sort: optional(oneOf('name', 'price', 'updated', 'quantity')),
      storeSlug: optional(str),
    })),
  },
}

export type WorkspaceServiceName = keyof typeof workspaceMethods
export type PublicServiceName = keyof typeof publicMethods

export const workspaceServiceNames = Object.keys(workspaceMethods) as WorkspaceServiceName[]
export const publicServiceNames = Object.keys(publicMethods) as PublicServiceName[]

function lookup(table: object, service: string, method: string): ArgsCheck | undefined {
  if (!Object.hasOwn(table, service)) return undefined
  const methods: unknown = Reflect.get(table, service)
  if (typeof methods !== 'object' || methods === null) return undefined
  if (!Object.hasOwn(methods, method)) throw new Error(`Unknown method: ${service}.${method}`)
  const check: unknown = Reflect.get(methods, method)
  return typeof check === 'function' ? check as ArgsCheck : undefined
}

function invoke(service: object, method: string, list: unknown[]): Promise<unknown> {
  const fn: unknown = Reflect.get(service, method)
  if (typeof fn !== 'function') throw new Error(`Unknown method: ${method}`)
  return Promise.resolve(Reflect.apply(fn, service, list))
}

export async function dispatchMockCall(store: MockStore, viewer: Viewer, call: MockCall): Promise<unknown> {
  const publicCheck = lookup(publicMethods, call.service, call.method)
  const workspaceCheck = publicCheck ? undefined : lookup(workspaceMethods, call.service, call.method)
  const check = publicCheck ?? workspaceCheck
  if (!check) throw new Error(`Unknown service: ${call.service}`)
  if (!Array.isArray(call.args) || !check(call.args)) throw new Error(`Invalid arguments for ${call.service}.${call.method}`)

  if (publicCheck) {
    const services = publicServices(store, viewer)
    return invoke(Reflect.get(services, call.service) as object, call.method, call.args)
  }
  if (viewer.kind !== 'user') throw new Error('Sign in to continue')
  const services = workspaceFor(viewer, store)
  return invoke(Reflect.get(services, call.service) as object, call.method, call.args)
}
