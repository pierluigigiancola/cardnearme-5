/** Small deterministic PRNG so mock data is stable across server and client renders. */
export function createRandom(seed: number) {
  let state = seed >>> 0

  function next() {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  function int(min: number, max: number) {
    return Math.floor(next() * (max - min + 1)) + min
  }

  function pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(next() * items.length)]
    if (item === undefined) throw new Error('pick() called with an empty list')
    return item
  }

  function sample<T>(items: readonly T[], count: number): T[] {
    const pool = [...items]
    const result: T[] = []
    while (result.length < count && pool.length > 0) {
      const [item] = pool.splice(Math.floor(next() * pool.length), 1)
      if (item !== undefined) result.push(item)
    }
    return result
  }

  function chance(probability: number) {
    return next() < probability
  }

  /** Skewed price: most cards are cheap, a few are expensive. */
  function price(max: number) {
    return Math.round(Math.pow(next(), 4) * max * 100) / 100 + 0.02
  }

  return {
    chance,
    int,
    next,
    pick,
    price,
    sample,
  }
}

export type Random = ReturnType<typeof createRandom>

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Fixed "now" so relative dates in mock data do not drift between SSR and hydration. */
export const MOCK_NOW = Date.parse('2026-10-18T10:00:00Z')

export function daysAgo(days: number) {
  return new Date(MOCK_NOW - days * 86_400_000).toISOString()
}
