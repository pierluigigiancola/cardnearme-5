import { describe, expect, it } from 'vitest'

import { ANONYMOUS_RESULT_CAP, capResults, canJoinAnotherStore, resultCapFor, STORE_JOIN_CAP } from './caps'

const anonymous = { kind: 'anonymous' } as const
const trader = { kind: 'user' } as const

function numbers(count: number) {
  return Array.from({ length: count }, (_, index) => index + 1)
}

describe('resultCapFor', () => {
  it('caps anonymous visitors at 30 results', () => {
    expect(ANONYMOUS_RESULT_CAP).toBe(30)
    expect(resultCapFor(anonymous)).toBe(30)
  })

  it('does not cap signed-in Traders', () => {
    expect(resultCapFor(trader)).toBeNull()
  })
})

describe('capResults', () => {
  it('returns the capped amount and reports cappedAt when there are more results than the cap', () => {
    const page = capResults(numbers(45), { cap: 30 })
    expect(page.items).toHaveLength(30)
    expect(page.items.at(-1)).toBe(30)
    expect(page.cappedAt).toBe(30)
  })

  it('clamps a requested limit above the cap, so a bigger limit cannot raise it', () => {
    const page = capResults(numbers(45), {
      cap: 30,
      limit: 1000,
    })
    expect(page.items).toHaveLength(30)
    expect(page.cappedAt).toBe(30)
  })

  it('treats a limit below the cap as a smaller page, not capping', () => {
    const page = capResults(numbers(45), {
      cap: 30,
      limit: 8,
    })
    expect(page.items).toEqual(numbers(8))
    expect(page.cappedAt).toBeNull()
  })

  it('reports cappedAt when the requested limit equals the cap and more results exist', () => {
    expect(capResults(numbers(31), {
      cap: 30,
      limit: 30,
    }).cappedAt).toBe(30)
  })

  it('does not report a cap when every result fits', () => {
    const page = capResults(numbers(30), { cap: 30 })
    expect(page.items).toHaveLength(30)
    expect(page.cappedAt).toBeNull()
  })

  it('pages uncapped viewers by their limit, or returns everything', () => {
    expect(capResults(numbers(45), {
      cap: null,
      limit: 8,
    })).toEqual({
      cappedAt: null,
      items: numbers(8),
    })
    expect(capResults(numbers(45), { cap: null }).items).toHaveLength(45)
  })

  it('ignores a negative or fractional limit', () => {
    expect(capResults(numbers(10), {
      cap: null,
      limit: -5,
    }).items).toEqual([])
    expect(capResults(numbers(10), {
      cap: null,
      limit: 2.7,
    }).items).toEqual([1, 2])
  })
})

describe('store-join cap', () => {
  it('lets a Trader join up to 5 Stores', () => {
    expect(STORE_JOIN_CAP).toBe(5)
    expect(canJoinAnotherStore(0)).toBe(true)
    expect(canJoinAnotherStore(4)).toBe(true)
    expect(canJoinAnotherStore(5)).toBe(false)
  })
})
