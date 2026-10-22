import { describe, expect, it } from 'vitest'

import { distribution, drawProbability, expandDeck, hypergeometric, shuffle } from './deckMath'

describe('hypergeometric', () => {
  it('matches hand-computed odds for a small deck', () => {
    // 10 cards, 3 hits, draw 2: C(7,2)/C(10,2), 3·7/C(10,2), C(3,2)/C(10,2)
    expect(hypergeometric(10, 3, 2, 0)).toBeCloseTo(21 / 45, 12)
    expect(hypergeometric(10, 3, 2, 1)).toBeCloseTo(21 / 45, 12)
    expect(hypergeometric(10, 3, 2, 2)).toBeCloseTo(3 / 45, 12)
  })

  it('matches the known opening-hand odds of missing a 4-of in 60 cards', () => {
    // C(56,7)/C(60,7) = (53·52·51·50)/(60·59·58·57)
    expect(hypergeometric(60, 4, 7, 0)).toBeCloseTo((53 * 52 * 51 * 50) / (60 * 59 * 58 * 57), 12)
  })

  it('is zero for impossible outcomes', () => {
    expect(hypergeometric(60, 4, 7, 5)).toBe(0)
    expect(hypergeometric(60, 4, 7, 8)).toBe(0)
    expect(hypergeometric(60, 4, 7, -1)).toBe(0)
    // Only one non-hit card, so drawing 3 must hit at least twice.
    expect(hypergeometric(5, 4, 3, 0)).toBe(0)
    expect(hypergeometric(5, 4, 3, 1)).toBe(0)
  })

  it('is certain when the whole deck is drawn', () => {
    expect(hypergeometric(40, 3, 40, 3)).toBeCloseTo(1, 12)
  })
})

describe('drawProbability', () => {
  it('sums the matching outcomes for each comparison', () => {
    const p = [0, 1, 2].map(k => hypergeometric(10, 3, 2, k))
    expect(drawProbability(10, 3, 2, 1, 'exactly')).toBeCloseTo(p[1] ?? NaN, 12)
    expect(drawProbability(10, 3, 2, 1, 'atLeast')).toBeCloseTo((p[1] ?? NaN) + (p[2] ?? NaN), 12)
    expect(drawProbability(10, 3, 2, 1, 'atMost')).toBeCloseTo((p[0] ?? NaN) + (p[1] ?? NaN), 12)
  })

  it('gives roughly 40% to see a 4-of in a 7-card opening hand', () => {
    expect(drawProbability(60, 4, 7, 1, 'atLeast')).toBeCloseTo(0.3995, 4)
  })

  it('treats "at least 0" and "at most all copies" as certain', () => {
    expect(drawProbability(60, 4, 7, 0, 'atLeast')).toBeCloseTo(1, 12)
    expect(drawProbability(60, 4, 7, 4, 'atMost')).toBeCloseTo(1, 12)
  })

  it('is zero when asking for more copies than can be drawn', () => {
    expect(drawProbability(60, 4, 7, 5, 'atLeast')).toBe(0)
    expect(drawProbability(60, 4, 2, 3, 'exactly')).toBe(0)
  })

  it('has complementary "at least n" and "at most n-1"', () => {
    const atLeast = drawProbability(99, 10, 12, 2, 'atLeast')
    const atMost = drawProbability(99, 10, 12, 1, 'atMost')
    expect(atLeast + atMost).toBeCloseTo(1, 12)
  })
})

describe('distribution', () => {
  it('has one entry per possible hit count and sums to 1', () => {
    const result = distribution(60, 4, 7)
    expect(result).toHaveLength(5)
    expect(result.reduce((total, p) => total + p, 0)).toBeCloseTo(1, 12)
    result.forEach((p, k) => expect(p).toBeCloseTo(hypergeometric(60, 4, 7, k), 15))
  })

  it('is capped by the number of draws when that is smaller than the copies', () => {
    expect(distribution(60, 20, 3)).toHaveLength(4)
  })

  it('is a single certain outcome when the deck has no copies', () => {
    expect(distribution(60, 0, 7)).toEqual([1])
  })
})

describe('shuffle', () => {
  /** Deterministic LCG so the permutation is reproducible. */
  function seeded(seed: number) {
    let state = seed
    return () => {
      state = (state * 1664525 + 1013904223) % 2 ** 32
      return state / 2 ** 32
    }
  }

  it('returns a permutation without mutating the input', () => {
    const items = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8])
    const result = shuffle(items, seeded(42))
    expect(result).not.toBe(items)
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('is reproducible with the same random source', () => {
    const items = Array.from({ length: 20 }, (_, index) => index)
    expect(shuffle(items, seeded(7))).toEqual(shuffle(items, seeded(7)))
    expect(shuffle(items, seeded(7))).not.toEqual(items)
  })

  it('swaps from the back using the random source (Fisher-Yates)', () => {
    // random() = 0 always picks j = 0; just below 1 always picks j = i.
    expect(shuffle(['a', 'b', 'c', 'd'], () => 0)).toEqual(['b', 'c', 'd', 'a'])
    expect(shuffle(['a', 'b', 'c', 'd'], () => 0.999999)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('handles empty and single-item lists', () => {
    expect(shuffle([], () => 0.5)).toEqual([])
    expect(shuffle(['only'], () => 0.5)).toEqual(['only'])
  })
})

describe('expandDeck', () => {
  it('repeats each card by its quantity, keeping order', () => {
    expect(expandDeck([
      {
        card: 'bolt',
        quantity: 2,
      },
      {
        card: 'island',
        quantity: 3,
      },
    ])).toEqual(['bolt', 'bolt', 'island', 'island', 'island'])
  })

  it('keeps the same card reference for every copy', () => {
    const card = { name: 'Sol Ring' }
    const [first, second] = expandDeck([{
      card,
      quantity: 2,
    }])
    expect(first).toBe(card)
    expect(second).toBe(card)
  })

  it('skips entries with no copies', () => {
    expect(expandDeck([
      {
        card: 'gone',
        quantity: 0,
      },
      {
        card: 'kept',
        quantity: 1,
      },
    ])).toEqual(['kept'])
    expect(expandDeck([])).toEqual([])
  })
})
