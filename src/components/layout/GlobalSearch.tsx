import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { MapPin, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { GameBadge, Price } from '#/components/cards/CardBits'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'
import { gamesQuery, globalSearchQuery } from '#/services/queries'

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timeout)
  }, [ms, value])
  return debounced
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

/** Header search over cards and cities. Press "/" anywhere to focus it. */
export function GlobalSearch({ className, onPick }: {
  className?: string;
  /** Called after a result is opened (e.g. to close the drawer the search sits in). */
  onPick?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounced(q, 150)
  const { data } = useQuery({
    ...globalSearchQuery(debounced),
    enabled: debounced.trim().length > 1,
  })
  const { data: games = [] } = useQuery(gamesQuery())

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !isTypingTarget(event.target)) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const close = () => {
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
  }
  const pick = () => {
    close()
    onPick?.()
  }

  const firstCard = data?.cards[0]
  const firstCity = data?.cities[0]
  const hasResults = Boolean(data && (data.cards.length > 0 || data.cities.length > 0))

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        aria-label="Search cards or cities"
        className="h-9 pr-9 pl-9"
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setQ(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close()
          if (event.key === 'Enter') {
            if (firstCity && !firstCard) {
              void navigate({
                params: { city: firstCity.slug },
                to: '/city/$city',
              })
              pick()
            }
            else if (firstCard) {
              void navigate({
                params: {
                  card: firstCard.slug,
                  game: firstCard.gameId,
                  number: firstCard.number,
                  set: firstCard.setCode,
                },
                to: '/sets/$game/$set/$card/$number',
              })
              pick()
            }
          }
        }}
        placeholder="Search cards or cities"
        ref={inputRef}
        value={q}
      />

      <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground sm:block">/</kbd>

      {open && q.trim().length > 1 && (
        <div className="absolute top-full right-0 left-0 z-50 mt-2 max-h-[70vh] overflow-auto rounded-xl border bg-popover p-2 shadow-xl">
          {!hasResults && <p className="p-3 text-sm text-muted-foreground">No cards or cities found.</p>}

          {data && data.cities.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Cities</p>

              {data.cities.map(city => (
                <Link
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent"
                  key={city.slug}
                  onClick={pick}
                  params={{ city: city.slug }}
                  to="/city/$city"
                >
                  <MapPin className="size-4 text-primary" />

                  {city.name}

                  <span className="text-muted-foreground">{city.country}</span>
                </Link>
              ))}
            </div>
          )}

          {data && data.cards.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Cards</p>

              {data.cards.map((card) => {
                const game = games.find(g => g.id === card.gameId)
                return (
                  <Link
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent"
                    key={card.id}
                    onClick={pick}
                    params={{
                      card: card.slug,
                      game: card.gameId,
                      number: card.number,
                      set: card.setCode,
                    }}
                    to="/sets/$game/$set/$card/$number"
                  >
                    <span className="flex-1 truncate font-medium">{card.name}</span>

                    {game && <GameBadge game={game} />}

                    <Price amount={card.prices.nonfoil} />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
