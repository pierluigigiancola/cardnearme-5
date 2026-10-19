import { Link } from '@tanstack/react-router'
import { ArrowUpRight, MapPin, Store as StoreIcon, Users } from 'lucide-react'

import { cn } from '#/lib/utils'
import type { Store } from '#/services/types'

/**
 * Lightweight stand-in for a real map: plots stores by lat/lng inside a box.
 * Replace with Leaflet/MapLibre once real store data and tiles are wired.
 */
export function StoreMap({ className, onSelect, selected, stores }: {
  stores: Store[];
  className?: string;
  /** Turns pins into toggles (e.g. picking stores) instead of links. */
  onSelect?: (storeSlug: string) => void;
  selected?: string[]
}) {
  if (stores.length === 0) return null
  const lats = stores.map(store => store.lat)
  const lngs = stores.map(store => store.lng)
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)]
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)]
  const spanLat = maxLat - minLat || 1
  const spanLng = maxLng - minLng || 1

  return (
    <div
      aria-label="Store map"
      className={cn('relative min-h-64 overflow-hidden rounded-xl border bg-[radial-gradient(circle_at_center,var(--color-accent),var(--color-muted))]', className)}
      role={onSelect ? 'group' : 'img'}
    >
      <div className="absolute inset-0 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />

      {stores.map((store) => {
        const position = {
          left: `${(10 + ((store.lng - minLng) / spanLng) * 80).toFixed(2)}%`,
          top: `${(15 + (1 - (store.lat - minLat) / spanLat) * 75).toFixed(2)}%`,
        }
        const pin = (
          <span className={cn('flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold shadow-lg', !selected || selected.includes(store.slug) ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground ring-1 ring-border')}>
            <MapPin className="size-3" />

            {store.traderCount}
          </span>
        )
        return onSelect
          ? (
            <button
              aria-label={store.name}
              aria-pressed={selected?.includes(store.slug) ?? false}
              className="group absolute -translate-x-1/2 -translate-y-full"
              key={store.slug}
              onClick={() => onSelect(store.slug)}
              style={position}
              title={store.name}
              type="button"
            >
              {pin}
            </button>
          )
          : (
            <Link
              className="group absolute -translate-x-1/2 -translate-y-full"
              key={store.slug}
              params={{ store: store.slug }}
              style={position}
              title={store.name}
              to="/stores/$store"
            >
              {pin}
            </Link>
          )
      })}
    </div>
  )
}

export function StoreList({ stores }: { stores: Store[] }) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {stores.map(store => (
        <li key={store.slug}>
          <Link
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-accent"
            params={{ store: store.slug }}
            to="/stores/$store"
          >
            <StoreIcon className="size-4 shrink-0 text-muted-foreground" />

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{store.name}</p>

              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3" />

                {store.traderCount}

                {' '}

                {store.traderCount === 1 ? 'trader' : 'traders'}

                {store.isHub && <span className="ml-2 rounded-full bg-primary/15 px-2 text-primary">Trading hub</span>}
              </p>
            </div>

            <ArrowUpRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
