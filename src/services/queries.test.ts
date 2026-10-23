import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { gameQuery, gamesQuery, globalSearchQuery } from './queries'

describe('catalogue queries', () => {
  it('read from the active services', async () => {
    const client = new QueryClient()
    const games = await client.fetchQuery(gamesQuery())
    const first = games.at(0)
    if (!first) throw new Error('No games seeded')

    const game = await client.fetchQuery(gameQuery(first.id))
    expect(game?.id).toBe(first.id)
  })

  it('call service functions that are not namespaced', async () => {
    const client = new QueryClient()
    const result = await client.fetchQuery(globalSearchQuery('a'))
    expect(result).toBeTypeOf('object')
  })
})
