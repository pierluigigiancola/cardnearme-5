import { describe, expect, it } from 'vitest'

import { listTradeItemsFor } from './tradeItems'

import { ANONYMOUS_RESULT_CAP } from '#/domain'

const anonymous = { kind: 'anonymous' } as const
const trader = { kind: 'user' } as const
// Every seeded Have, across Cities: comfortably more than the anonymous cap.
const everyHave = { listType: 'haves' } as const

describe('listTradeItemsFor', () => {
  it('gives an anonymous visitor the capped amount and says so', async () => {
    const page = await listTradeItemsFor(anonymous, everyHave)
    expect(page.total).toBeGreaterThan(ANONYMOUS_RESULT_CAP)
    expect(page.items).toHaveLength(ANONYMOUS_RESULT_CAP)
    expect(page.cappedAt).toBe(ANONYMOUS_RESULT_CAP)
  })

  it('ignores a bigger limit from an anonymous visitor', async () => {
    const page = await listTradeItemsFor(anonymous, {
      ...everyHave,
      limit: 10_000,
    })
    expect(page.items).toHaveLength(ANONYMOUS_RESULT_CAP)
    expect(page.cappedAt).toBe(ANONYMOUS_RESULT_CAP)
  })

  it('pages an anonymous visitor below the cap without reporting a cap', async () => {
    const page = await listTradeItemsFor(anonymous, {
      ...everyHave,
      limit: 8,
    })
    expect(page.items).toHaveLength(8)
    expect(page.cappedAt).toBeNull()
  })

  it('shows a signed-in Trader every result', async () => {
    const page = await listTradeItemsFor(trader, everyHave)
    expect(page.items).toHaveLength(page.total)
    expect(page.cappedAt).toBeNull()
  })
})
