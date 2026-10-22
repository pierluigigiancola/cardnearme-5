import type { DeckCard, GameId } from '#/services/types'

/**
 * Simplified deck-construction rules per game and format. Good enough for
 * builder feedback; swap for the rules service once one exists.
 */

export interface DeckIssue {
  level: 'error' | 'warning'
  message: string
}

const minimumSize: Record<GameId, number> = {
  fab: 60,
  fusionworld: 50,
  lorcana: 60,
  mtg: 60,
  onepiece: 50,
  riftbound: 40,
  swu: 50,
}

const maxCopies: Record<GameId, number> = {
  fab: 3,
  fusionworld: 4,
  lorcana: 4,
  mtg: 4,
  onepiece: 4,
  riftbound: 3,
  swu: 3,
}

const isBasicLand = (entry: DeckCard) => entry.card.typeLine.startsWith('Basic')

export function deckCounts(entries: DeckCard[]) {
  const count = (section: DeckCard['section']) =>
    entries.filter(entry => entry.section === section).reduce((total, entry) => total + entry.quantity, 0)
  return {
    commander: count('commander'),
    considering: count('considering'),
    mainboard: count('mainboard'),
    sideboard: count('sideboard'),
  }
}

export function validateDeck(deck: {
  gameId: GameId;
  format: string;
  cards: DeckCard[]
}): DeckIssue[] {
  const issues: DeckIssue[] = []
  const format = deck.format.toLowerCase()
  const counts = deckCounts(deck.cards)
  const playable = deck.cards.filter(entry => entry.section !== 'considering')
  const singleton = deck.gameId === 'mtg' && format === 'commander'

  if (singleton) {
    if (counts.commander < 1) issues.push({
      level: 'error',
      message: 'Choose a commander',
    })
    if (counts.commander > 2) issues.push({
      level: 'error',
      message: 'A deck can have at most two commanders',
    })
    if (counts.commander + counts.mainboard !== 100) {
      issues.push({
        level: 'error',
        message: `Commander decks have exactly 100 cards (now ${counts.commander + counts.mainboard})`,
      })
    }
  }
  else {
    const minimum = minimumSize[deck.gameId]
    if (counts.mainboard < minimum) {
      issues.push({
        level: 'error',
        message: `The main deck needs at least ${minimum} cards (now ${counts.mainboard})`,
      })
    }
    if (counts.sideboard > 15) {
      issues.push({
        level: 'error',
        message: `Sideboards hold up to 15 cards (now ${counts.sideboard})`,
      })
    }
  }

  const copies = new Map<string, number>()
  for (const entry of playable) {
    if (isBasicLand(entry)) continue
    copies.set(entry.card.name, (copies.get(entry.card.name) ?? 0) + entry.quantity)
  }
  const limit = singleton ? 1 : maxCopies[deck.gameId]
  for (const [name, total] of copies) {
    if (total > limit) issues.push({
      level: 'error',
      message: `${name}: ${total} copies (max ${limit})`,
    })
  }

  // One check per card name: the same card often sits in several sections, and
  // the deck page keys issues by message.
  const checked = new Set<string>()
  for (const entry of playable) {
    if (checked.has(entry.card.name)) continue
    checked.add(entry.card.name)
    const legality = Object.hasOwn(entry.card.legalities, format) ? entry.card.legalities[format] : undefined
    if (legality === 'banned') issues.push({
      level: 'error',
      message: `${entry.card.name} is banned in ${deck.format}`,
    })
    else if (legality === 'not_legal') issues.push({
      level: 'error',
      message: `${entry.card.name} is not legal in ${deck.format}`,
    })
    else if (legality === 'restricted' && (copies.get(entry.card.name) ?? 0) > 1) {
      issues.push({
        level: 'error',
        message: `${entry.card.name} is restricted to one copy`,
      })
    }
    else if (legality === undefined && deck.gameId === 'mtg') {
      issues.push({
        level: 'warning',
        message: `No legality data for ${entry.card.name} in ${deck.format}`,
      })
    }
  }

  return issues
}
