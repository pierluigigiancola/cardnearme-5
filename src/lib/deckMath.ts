/** Pure helpers for the deck tools (opening hand simulator and draw odds). */

function logFactorial(n: number) {
  let result = 0
  for (let i = 2; i <= n; i++) result += Math.log(i)
  return result
}

function logChoose(n: number, k: number) {
  if (k < 0 || k > n) return -Infinity
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k)
}

/**
 * P(X = k) when drawing `draws` cards from a deck of `deckSize` that contains
 * `copies` successes (hypergeometric distribution).
 */
export function hypergeometric(deckSize: number, copies: number, draws: number, k: number) {
  const log = logChoose(copies, k) + logChoose(deckSize - copies, draws - k) - logChoose(deckSize, draws)
  return Number.isFinite(log) ? Math.exp(log) : 0
}

export type Comparison = 'atLeast' | 'exactly' | 'atMost'

export function drawProbability(deckSize: number, copies: number, draws: number, want: number, comparison: Comparison) {
  let total = 0
  for (let k = 0; k <= Math.min(copies, draws); k++) {
    const include = comparison === 'atLeast' ? k >= want : comparison === 'atMost' ? k <= want : k === want
    if (include) total += hypergeometric(deckSize, copies, draws, k)
  }
  return total
}

export function distribution(deckSize: number, copies: number, draws: number) {
  return Array.from({ length: Math.min(copies, draws) + 1 }, (_, k) => hypergeometric(deckSize, copies, draws, k))
}

/** Fisher-Yates shuffle using an injectable random source (tests pass a seeded one). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const a = result[i]
    const b = result[j]
    if (a !== undefined && b !== undefined) {
      result[i] = b
      result[j] = a
    }
  }
  return result
}

/** Expands `{ card, quantity }` entries into one element per physical card. */
export function expandDeck<T>(entries: readonly {
  card: T;
  quantity: number
}[]): T[] {
  return entries.flatMap(entry => Array.from({ length: entry.quantity }, () => entry.card))
}
