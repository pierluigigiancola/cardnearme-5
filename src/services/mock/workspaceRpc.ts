import { createServerFn } from '@tanstack/react-start'

import type { WorkspaceServices } from '../services'

import { fetchViewer } from '#/auth/viewer'

/**
 * Bridge between the browser and the mock workspace (`./workspace.ts`).
 *
 * Workspace data is private and mutable, so the mock keeps it in server
 * memory: it survives page reloads, SSR and the browser see the same state,
 * and every call resolves the viewer from the session (a real backend must do
 * the same — route guards do not protect data). Each method call is sent as
 * `{ service, method, args }` to one server function; arguments and results
 * are plain JSON.
 */

const serviceNames = ['binder', 'chat', 'deckBuilder', 'lists', 'notifications', 'profile', 'trades'] as const satisfies readonly (keyof WorkspaceServices)[]

type ServiceName = (typeof serviceNames)[number]

function isServiceName(value: string): value is ServiceName {
  return serviceNames.some(name => name === value)
}

interface WorkspaceCall {
  service: string
  method: string
  /** JSON-encoded argument list. */
  args: string
}

const callWorkspace = createServerFn({ method: 'POST' })
  .validator((input: WorkspaceCall) => input)
  .handler(async ({ data }) => {
    const viewer = await fetchViewer()
    if (viewer.kind !== 'user') throw new Error('Sign in to continue')
    if (!isServiceName(data.service)) throw new Error(`Unknown service: ${data.service}`)

    const { workspaceFor } = await import('./workspace')
    const service = workspaceFor(viewer)[data.service]
    const method: unknown = Object.hasOwn(service, data.method) ? Reflect.get(service, data.method) : undefined
    if (typeof method !== 'function') throw new Error(`Unknown method: ${data.service}.${data.method}`)

    const args: unknown = JSON.parse(data.args)
    if (!Array.isArray(args)) throw new Error('Arguments must be a list')
    const result: unknown = await Reflect.apply(method, service, args)
    return JSON.stringify(result ?? null)
  })

function remote<TName extends ServiceName>(service: TName): WorkspaceServices[TName] {
  const methods = new Map<string, (...args: unknown[]) => Promise<unknown>>()
  // Methods are created on first access, so the client needs no list of them.
  return new Proxy({} as WorkspaceServices[TName], {
    get: (_target, method) => {
      if (typeof method !== 'string' || method === 'then') return undefined
      let call = methods.get(method)
      if (!call) {
        call = async (...args: unknown[]) => {
          // JSON turns trailing `undefined` into `null`, which would defeat default parameters.
          while (args.length > 0 && args.at(-1) === undefined) args.pop()
          const json = await callWorkspace({
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
