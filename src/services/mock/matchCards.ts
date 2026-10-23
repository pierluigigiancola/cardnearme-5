import type { CatalogueService } from '../services'
import type { CardMatchRow, Printing } from '../types'

import { printings } from './data'

type MatchOptions = NonNullable<Parameters<CatalogueService['matchCards']>[1]>

function matchRow(row: CardMatchRow, pool: Printing[], preferGames: MatchOptions['preferGames']) {
  const name = row.name.trim().toLowerCase()
  const setCode = row.setCode?.toLowerCase()
  const byPrinting = setCode && row.number
    ? pool.find(printing => printing.setCode.toLowerCase() === setCode && printing.number === row.number)
    : undefined
  if (byPrinting) return byPrinting
  const named = pool.filter(printing => printing.name.toLowerCase() === name)
  const inSet = setCode ? named.find(printing => printing.setCode.toLowerCase() === setCode) : undefined
  return inSet ?? named.find(printing => preferGames?.includes(printing.gameId)) ?? named.at(0) ?? null
}

/** The mock catalogue's matcher, shared by `catalogue.matchCards` and the Binder import. */
export function matchCards(rows: CardMatchRow[], { gameId, preferGames }: MatchOptions = {}): (Printing | null)[] {
  const pool = gameId ? printings.filter(printing => printing.gameId === gameId) : printings
  return rows.map(row => matchRow(row, pool, preferGames))
}
