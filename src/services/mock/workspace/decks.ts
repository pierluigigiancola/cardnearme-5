import type { DeckBuilderService } from '../../services'
import type { DeckInput, OwnedDeck } from '../../types'
import { games } from '../data'
import { compare } from '../queryHelpers'

import { clampQuantity, now, requireCard } from './context'
import type { TraderContext } from './context'

const deckSections = new Set(['commander', 'mainboard', 'sideboard', 'considering'])

export function deckBuilderService(ctx: TraderContext): DeckBuilderService {
  const { trader } = ctx

  const fromInput = (input: DeckInput, existing?: OwnedDeck): OwnedDeck => {
    const name = input.name.trim().slice(0, 80)
    if (!name) throw new Error('Give the deck a name')
    const game = games.find(candidate => candidate.id === input.gameId)
    if (!game) throw new Error('Unknown game')
    return {
      cards: input.cards.slice(0, 500).map((entry) => {
        if (!deckSections.has(entry.section)) throw new Error('Unknown deck section')
        return {
          card: requireCard(entry.cardId),
          quantity: clampQuantity(entry.quantity),
          section: entry.section,
        }
      }),
      commentCount: existing?.commentCount ?? 0,
      description: input.description.trim().slice(0, 2000),
      format: input.format,
      gameId: game.id,
      id: existing?.id ?? ctx.id('deck'),
      likes: existing?.likes ?? 0,
      name,
      ownerUsername: ctx.me,
      updatedAt: now(),
      visibility: input.visibility === 'private' ? 'private' : 'public',
    }
  }

  return {
    create: async (input) => {
      const deck = fromInput(input)
      trader.decks.push(deck)
      return deck
    },
    getMine: async deckId => trader.decks.find(deck => deck.id === deckId) ?? null,
    listMine: async () => [...trader.decks].sort((a, b) => compare(a.updatedAt, b.updatedAt, 'desc')),
    remove: async (deckId) => {
      trader.decks = trader.decks.filter(deck => deck.id !== deckId)
    },
    update: async (deckId, input) => {
      const existing = trader.decks.find(deck => deck.id === deckId)
      if (!existing) throw new Error('Deck not found')
      const deck = fromInput(input, existing)
      trader.decks = trader.decks.map(candidate => (candidate === existing ? deck : candidate))
      return deck
    },
  }
}
