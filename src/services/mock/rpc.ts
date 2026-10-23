import { createServerFn } from '@tanstack/react-start'

import type { WorkspaceServices } from '../services'

import type { PublicServiceName, WorkspaceServiceName } from './dispatch'
import type { StorePublicServices } from './public'

import { fetchViewer } from '#/auth/viewer'

/**
 * Bridge between the browser and the mock store (`./store.ts`).
 *
 * Every Trader's data lives in one store in server memory: it survives page
 * reloads, SSR and the browser see the same state, and the public pages and
 * the signed-in workspace read and write the same records. Each method call
 * is sent as `{ service, method, args }` to one server function, which
 * resolves the viewer from the session (a real backend must do the same:
 * route guards do not protect data) and hands the call to `dispatch.ts`,
 * which accepts only known methods and checks their arguments. Arguments and
 * results are plain JSON.
 */

interface StoreCall {
  service: string
  method: string
  /** JSON-encoded argument list. */
  args: string
}

const callStore = createServerFn({ method: 'POST' })
  .validator((input: StoreCall) => input)
  .handler(async ({ data }) => {
    const viewer = await fetchViewer()
    const args: unknown = JSON.parse(data.args)
    if (!Array.isArray(args)) throw new Error('Arguments must be a list')
    const [{ dispatchMockCall }, { mockStore }] = await Promise.all([import('./dispatch'), import('./store')])
    const result = await dispatchMockCall(mockStore, viewer, {
      args,
      method: data.method,
      service: data.service,
    })
    return JSON.stringify(result ?? null)
  })

type RemoteServices = WorkspaceServices & StorePublicServices

function remote<TName extends WorkspaceServiceName | PublicServiceName>(service: TName): RemoteServices[TName] {
  const methods = new Map<string, (...args: unknown[]) => Promise<unknown>>()
  // Methods are created on first access, so the client needs no list of them.
  return new Proxy({} as RemoteServices[TName], {
    get: (_target, method) => {
      if (typeof method !== 'string' || method === 'then') return undefined
      let call = methods.get(method)
      if (!call) {
        call = async (...args: unknown[]) => {
          // JSON turns trailing `undefined` into `null`, which would defeat default parameters.
          while (args.length > 0 && args.at(-1) === undefined) args.pop()
          const json = await callStore({
            data: {
              args: JSON.stringify(args),
              method,
              service,
            },
          })
          return JSON.parse(json) as unknown
        }
        methods.set(method, call)
      }
      return call
    },
  })
}

export const mockWorkspaceServices: WorkspaceServices = {
  binder: remote('binder'),
  chat: remote('chat'),
  deckBuilder: remote('deckBuilder'),
  lists: remote('lists'),
  notifications: remote('notifications'),
  profile: remote('profile'),
  trades: remote('trades'),
}

/** The public services that read Traders' data from the store. */
export const mockStoreServices: StorePublicServices = {
  catalogue: remote('catalogue'),
  community: remote('community'),
  trading: remote('trading'),
}
