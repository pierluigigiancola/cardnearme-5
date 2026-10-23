import type { CatalogueService } from '../services'
import type { CardMatchRow, Printing } from '../types'

import { printings } from './data'

type ResolveOptions = NonNullable<Parameters<CatalogueService['matchCards']>[1]>

function resolveRow(row: CardMatchRow, pool: Printing[], preferGames: ResolveOptions['preferGames']) {
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

/**
 * Resolves imported rows to Printings, one (or null) per row: the mock
 * catalogue behind `catalogue.matchCards`, also used by the Binder import.
 * ("Resolve", not "match": a glossary Match is between two Traders.)
 *
 * The Binder import calls this directly rather than `catalogue.matchCards`:
 * the workspace runs on the server (`rpc.ts`), while `mockServices.catalogue`
 * is the client-side service, so going through it would be a circular import
 * and a client round trip inside a server call. The real backend does the
 * same, with both server functions calling one catalogue lookup.
 */
export function resolveImportRows(rows: CardMatchRow[], { gameId, preferGames }: ResolveOptions = {}): (Printing | null)[] {
  const pool = gameId ? printings.filter(printing => printing.gameId === gameId) : printings
  return rows.map(row => resolveRow(row, pool, preferGames))
}
