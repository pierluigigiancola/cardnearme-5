import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createStore } from './store'
import { workspaceFor } from './workspace'

let ownerSeq = 0

async function proposeToFirstMatch() {
  ownerSeq += 1
  const workspace = workspaceFor({
    id: `test-owner-${ownerSeq}`,
    onboarded: true,
    username: `tester${ownerSeq}`,
  }, createStore())
  const match = (await workspace.trades.listMatches()).at(0)
  if (!match) throw new Error('Seeded workspace has no matches')
  const context = await workspace.trades.getContext(match.partner.id)
  const wanted = context.partnerHaves.at(0)
  if (!wanted) throw new Error('Partner has no haves')
  const trade = await workspace.trades.propose({
    cash: null,
    get: [{
      price: wanted.price,
      quantity: 1,
      sourceId: wanted.id,
    }],
    give: [],
    meetAt: null,
    meetup: null,
    note: '',
    partner: context.partner.id,
  })
  return {
    trade,
    workspace,
  }
}

async function statusAfterReplyWindow() {
  const { trade, workspace } = await proposeToFirstMatch()
  vi.setSystemTime(Date.now() + 60_000)
  const thread = await workspace.chat.getThread(trade.chatId)
  return thread?.trades[trade.id]?.status
}

describe('mock trading partners', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('accept the viewer\'s proposal after a delay in development', async () => {
    vi.stubEnv('DEV', true)
    expect(await statusAfterReplyWindow()).toBe('accepted')
  })

  it('never accept on their own outside development', async () => {
    vi.stubEnv('DEV', false)
    expect(await statusAfterReplyWindow()).toBe('pending')
  })
})
