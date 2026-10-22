import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, LayoutGrid, Rows3, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { toggleFacet } from '#/lib/browseSearch'
import type { BrowseSearch } from '#/lib/browseSearch'
import { cn } from '#/lib/utils'
import type { Facet, SortOrder, ViewMode } from '#/services/types'

type SearchUpdater = (update: (previous: BrowseSearch) => BrowseSearch) => void

export function BrowseToolbar({
  onChange,
  placeholder = 'Search cards',
  search,
  sortOptions,
  sort,
  total,
  shown,
}: {
  search: BrowseSearch
  onChange: SearchUpdater
  sortOptions: {
    value: string;
    label: string
  }[]
  sort: string
  placeholder?: string
  total: number
  shown: number
}) {
  const [query, setQuery] = useState(search.q ?? '')

  // Debounce typing into the URL so every keystroke does not refetch.
  useEffect(() => {
    if (query === (search.q ?? '')) return
    const timeout = setTimeout(() => onChange(previous => ({
      ...previous,
      q: query || undefined,
    })), 250)
    return () => clearTimeout(timeout)
  }, [onChange, query, search.q])

  const view: ViewMode = search.view ?? 'visual'
  const order: SortOrder = search.order ?? 'desc'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          aria-label={placeholder}
          className="pl-9"
          onChange={event => setQuery(event.target.value)}
          placeholder={placeholder}
          value={query}
        />
      </div>

      <ToggleGroup
        aria-label="View"
        onValueChange={value => value && onChange(previous => ({
          ...previous,
          view: value === 'table' ? 'table' : 'visual',
        }))}
        type="single"
        value={view}
        variant="outline"
      >
        <ToggleGroupItem
          aria-label="Visual view"
          value="visual"
        >
          <LayoutGrid />
        </ToggleGroupItem>

        <ToggleGroupItem
          aria-label="Table view"
          value="table"
        >
          <Rows3 />
        </ToggleGroupItem>
      </ToggleGroup>

      <Select
        onValueChange={value => onChange(previous => ({
          ...previous,
          sort: value,
        }))}
        value={sort}
      >
        <SelectTrigger
          aria-label="Sort by"
          className="w-40"
        >
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          {sortOptions.map(option => (
            <SelectItem
              key={option.value}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        aria-label={order === 'asc' ? 'Ascending' : 'Descending'}
        onClick={() => onChange(previous => ({
          ...previous,
          order: order === 'asc' ? 'desc' : 'asc',
        }))}
        size="icon"
        variant="outline"
      >
        {order === 'asc' ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
      </Button>

      <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground tabular-nums">
        {shown}

        {' / '}

        {total}
      </span>
    </div>
  )
}

export function FacetSidebar({ facets, onChange, search }: {
  facets: Facet[];
  search: BrowseSearch;
  onChange: SearchUpdater
}) {
  const activeCount = Object.values(search.f ?? {}).reduce((sum, values) => sum + (values?.length ?? 0), 0)

  return (
    <aside className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-wide uppercase">Filters</h2>

        {activeCount > 0 && (
          <Button
            onClick={() => onChange(previous => ({
              ...previous,
              f: undefined,
            }))}
            size="sm"
            variant="ghost"
          >
            <X />
            Clear (

            {activeCount}
            )
          </Button>
        )}
      </div>

      {facets.filter(facet => facet.buckets.length > 0).map(facet => (
        <FacetGroup
          facet={facet}
          key={facet.key}
          onToggle={value => onChange(previous => ({
            ...previous,
            f: toggleFacet(previous.f, facet.key, value),
          }))}
          selected={search.f?.[facet.key] ?? []}
        />
      ))}
    </aside>
  )
}

function FacetGroup({ facet, onToggle, selected }: {
  facet: Facet;
  selected: string[];
  onToggle: (value: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? facet.buckets : facet.buckets.slice(0, 8)

  return (
    <details
      className="group border-b pb-3"
      open
    >
      <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-sm font-semibold">
        {facet.label}

        <ChevronDown className="size-4 transition group-open:rotate-180" />
      </summary>

      <ul className="mt-2 space-y-1.5">
        {visible.map(bucket => (
          <li key={bucket.value}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(bucket.value)}
                onCheckedChange={() => onToggle(bucket.value)}
              />

              <span className={cn('flex-1 truncate', selected.includes(bucket.value) && 'font-semibold')}>{bucket.label}</span>

              <span className="text-xs text-muted-foreground tabular-nums">{bucket.count}</span>
            </label>
          </li>
        ))}
      </ul>

      {facet.buckets.length > 8 && (
        <Button
          className="mt-1 h-7 px-0"
          onClick={() => setExpanded(value => !value)}
          size="sm"
          variant="link"
        >
          {expanded ? 'Show less' : `Show all (${facet.buckets.length})`}
        </Button>
      )}
    </details>
  )
}
