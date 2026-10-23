import { describe, expect, it } from 'vitest'

import { dispatchMockCall } from './dispatch'
import { createStore } from './store'
import { workspaceFor } from './workspace'

import type { Viewer } from '#/auth/viewer'

const viewer: Viewer = {
  demo: true,
  email: 'rpc@example.test',
  id: 'rpc-test-trader',
  kind: 'user',
  onboarded: true,
  username: 'rpctester',
}

const anonymous: Viewer = { kind: 'anonymous' }

describe('mock store RPC', () => {
  it('runs a known workspace method for the signed-in Trader', async () => {
    const store = createStore()
    const counts = await dispatchMockCall(store, viewer, {
      args: [],
      method: 'getCounts',
      service: 'binder',
    })
    expect(counts).toEqual(await workspaceFor(viewer, store).binder.getCounts())
  })

  it('rejects method names it does not know', async () => {
    const store = createStore()
    for (const method of ['constructor', 'toString', '__proto__', 'deleteEverything']) {
      await expect(dispatchMockCall(store, viewer, {
        args: [],
        method,
        service: 'binder',
      })).rejects.toThrow('Unknown method')
    }
    await expect(dispatchMockCall(store, viewer, {
      args: [],
      method: 'list',
      service: 'admin',
    })).rejects.toThrow('Unknown service')
  })

  it('rejects invalid arguments before calling the service', async () => {
    const store = createStore()
    const before = await workspaceFor(viewer, store).binder.getCounts()
    await expect(dispatchMockCall(store, viewer, {
      args: ['not a list'],
      method: 'addItems',
      service: 'binder',
    })).rejects.toThrow('Invalid arguments')
    await expect(dispatchMockCall(store, viewer, {
      args: [[{
        cardId: 42,
        condition: 'NM',
        finish: 'nonfoil',
        language: 'en',
        quantity: 1,
        section: 'haves',
      }]],
      method: 'addItems',
      service: 'binder',
    })).rejects.toThrow('Invalid arguments')
    await expect(dispatchMockCall(store, viewer, {
      args: ['a', 'b', 'c'],
      method: 'getCounts',
      service: 'binder',
    })).rejects.toThrow('Invalid arguments')
    expect(await workspaceFor(viewer, store).binder.getCounts()).toEqual(before)
  })

  it('asks anonymous visitors to sign in for workspace methods', async () => {
    await expect(dispatchMockCall(createStore(), anonymous, {
      args: [],
      method: 'getCounts',
      service: 'binder',
    })).rejects.toThrow('Sign in')
  })

  it('serves public methods to anonymous visitors', async () => {
    const page = await dispatchMockCall(createStore(), anonymous, {
      args: [{ listType: 'haves' }],
      method: 'listTradeItems',
      service: 'trading',
    })
    expect(page).toMatchObject({ total: expect.any(Number) })
  })
})
