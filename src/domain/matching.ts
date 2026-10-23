import type { CollectionQuantities } from './collection'
import { isHave } from './collection'
import type { ListVisibility } from './visibility'
import { publicOnly } from './visibility'
import type { ReceivedCopy, WantTarget } from './want'
import { fulfilsWant } from './want'

import type { MatchScope, UserId } from '#/services/types'

/**
 * The Matching rule (spec decisions 4 and 6, ADR 0002). A Match is a Have of
 * one Trader that satisfies a Want of another Trader in the same City: the
 * Have is a Collection entry with copies for trade, and it fulfils the Want
 * (`fulfilsWant`: same Card, every filter the Want sets is met).
 *
 * - The viewer's own City defines who matches: only Traders in that City. A
 *   viewer with no City has no Matches, and so does a scope naming another
 *   City (the City limits who finds whom).
 * - A Store in the scope only narrows that City to the Traders who joined it.
 *   Shared Stores otherwise rank Matches; they never define them.
 * - Other Traders' Haves and Wants count only on their public Lists. The
 *   viewer's own Wants all count, private Lists included, and so do the
 *   viewer's own Haves (the viewer may give any of their cards).
 */

/** A Collection entry as Matching reads it. */
export type MatchHave = ReceivedCopy & CollectionQuantities & {
  id: string
  listId: string
}

/** A Want as Matching reads it. */
export type MatchWant = WantTarget & {
  id: string
  listId: string
}

/** A Trader as Matching reads them: their City, Stores, Lists and Binder entries. */
export interface MatchTrader<THave extends MatchHave = MatchHave, TWant extends MatchWant = MatchWant> {
  id: UserId
  citySlug: string | null
  storeSlugs: string[]
  lists: ListVisibility[]
  /** Every Collection entry; only those with copies for trade are Haves. */
  haves: THave[]
  wants: TWant[]
}

/** The Matches between the viewer and one other Trader. */
export interface MatchResult<THave extends MatchHave = MatchHave> {
  partnerId: UserId
  citySlug: string
  sharedStoreSlugs: string[]
  /** The partner's public Haves that satisfy one of the viewer's Wants. */
  theyHave: THave[]
  /** The viewer's Haves that satisfy one of the partner's public Wants. */
  theyWant: THave[]
}

/** The Haves that satisfy at least one of the Wants, in their original order. */
export function wantedHaves<THave extends MatchHave>(haves: readonly THave[], wants: readonly WantTarget[]): THave[] {
  return haves.filter(entry => isHave(entry) && wants.some(target => fulfilsWant(entry, target)))
}

/**
 * What matches between the viewer and one other Trader, wherever they are:
 * the other's public Haves the viewer wants, and the viewer's Haves the
 * other wants on a public List. (The City scope is `findMatches`'s job.)
 */
export function matchBetween<THave extends MatchHave, TWant extends MatchWant>(me: MatchTrader<THave, TWant>, other: MatchTrader<THave, TWant>) {
  return {
    theyHave: wantedHaves(publicOnly(other.haves, other.lists), me.wants),
    theyWant: wantedHaves(me.haves, publicOnly(other.wants, other.lists)),
  }
}

/**
 * The City Matching runs in for the viewer: their own City, and only when the
 * scope names that City or none. `null` means no Matches.
 */
export function matchingCity(viewerCitySlug: string | null, scope: MatchScope): string | null {
  if (!viewerCitySlug) return null
  return !scope.citySlug || scope.citySlug === viewerCitySlug ? viewerCitySlug : null
}

/**
 * The viewer's Matches with the other Traders in the viewer's own City
 * (`matchingCity`), optionally narrowed to one Store. Ranked by Stores shared
 * with the viewer, then by the number of matched entries.
 */
export function findMatches<THave extends MatchHave, TWant extends MatchWant>(
  me: MatchTrader<THave, TWant>,
  traders: readonly MatchTrader<THave, TWant>[],
  scope: MatchScope,
): MatchResult<THave>[] {
  const citySlug = matchingCity(me.citySlug, scope)
  if (!citySlug) return []
  return traders
    .filter(other => other.id !== me.id
      && other.citySlug === citySlug
      && (!scope.storeSlug || other.storeSlugs.includes(scope.storeSlug)))
    .map(other => ({
      citySlug,
      partnerId: other.id,
      sharedStoreSlugs: other.storeSlugs.filter(slug => me.storeSlugs.includes(slug)),
      ...matchBetween(me, other),
    }))
    .filter(match => match.theyHave.length + match.theyWant.length > 0)
    .sort((a, b) => (b.sharedStoreSlugs.length - a.sharedStoreSlugs.length)
      || ((b.theyHave.length + b.theyWant.length) - (a.theyHave.length + a.theyWant.length)))
}
