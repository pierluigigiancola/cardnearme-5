import { isRedirect } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

import type { Viewer } from './viewer'
import { guardWorkspace } from './workspaceGuard'

import { createStore } from '#/services/mock/store'
import { workspaceFor } from '#/services/mock/workspace'

const trader: Extract<Viewer, { kind: 'user' }> = {
  demo: true,
  email: 'newcomer@example.com',
  id: 'demo-newcomer',
  kind: 'user',
  username: 'newcomer',
}

function setup() {
  const workspace = workspaceFor(trader, createStore())
  const loadProfile = () => workspace.profile.get()
  const visit = (pathname: string, viewer: Viewer = trader) => guardWorkspace({
    href: pathname,
    loadProfile,
    pathname,
    viewer,
  })
  return {
    visit,
    workspace,
  }
}

async function redirectOf(promise: Promise<unknown>) {
  try {
    await promise
  }
  catch (thrown) {
    if (isRedirect(thrown)) return thrown.options
    throw thrown
  }
  throw new Error('Expected a redirect')
}

describe('workspace guard', () => {
  it('sends anonymous visitors to sign in', async () => {
    const { visit } = setup()
    const options = await redirectOf(visit('/x/binder', { kind: 'anonymous' }))
    expect(options.to).toBe('/sign-in')
    expect(options.search).toEqual({ redirect: '/x/binder' })
  })

  it('sends a Trader who has not onboarded to onboarding', async () => {
    const { visit } = setup()
    const options = await redirectOf(visit('/x/binder'))
    expect(options.to).toBe('/x/onboarding')
    expect(options.search).toEqual({ redirect: '/x/binder' })
  })

  it('lets a Trader who has not onboarded open onboarding', async () => {
    const { visit } = setup()
    await expect(visit('/x/onboarding')).resolves.toEqual(trader)
  })

  it('lets a Trader in once completeOnboarding has run', async () => {
    const { visit, workspace } = setup()
    await workspace.profile.completeOnboarding({
      citySlug: 'milan--italy',
      showStoresOnProfile: true,
      storeSlugs: [],
    })
    await expect(visit('/x/binder')).resolves.toEqual(trader)
  })
})
