import type { FacetSelection, SortOrder, ViewMode } from '#/services/types'

/**
 * URL state shared by every browse page (set lists, city haves/wants, store
 * inventory). Kept in the URL so filtered views are shareable.
 */
export interface BrowseSearch {
  q?: string
  view?: ViewMode
  sort?: string
  order?: SortOrder
  f?: FacetSelection
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateBrowseSearch(search: Record<string, unknown>): BrowseSearch {
  const facets: FacetSelection = {}
  if (isRecord(search.f)) {
    for (const [key, value] of Object.entries(search.f)) {
      if (Array.isArray(value)) {
        const values = value.filter((item): item is string => typeof item === 'string')
        if (values.length > 0) facets[key] = values
      }
    }
  }
  return {
    f: Object.keys(facets).length > 0 ? facets : undefined,
    order: search.order === 'asc' || search.order === 'desc' ? search.order : undefined,
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    sort: typeof search.sort === 'string' ? search.sort : undefined,
    view: search.view === 'table' || search.view === 'visual' ? search.view : undefined,
  }
}

export function pickSort<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.find(option => option === value) ?? fallback
}

export function toggleFacet(selection: FacetSelection | undefined, key: string, value: string): FacetSelection | undefined {
  const current = selection?.[key] ?? []
  const nextValues = current.includes(value) ? current.filter(item => item !== value) : [...current, value]
  const next = Object.fromEntries(
    Object.entries({
      ...selection,
      [key]: nextValues,
    }).filter(([, values]) => values && values.length > 0),
  )
  return Object.keys(next).length > 0 ? next : undefined
}
