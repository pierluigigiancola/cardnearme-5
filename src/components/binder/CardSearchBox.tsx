import { useQuery } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { CardArt } from '#/components/cards/CardArt'
import { Price } from '#/components/cards/CardBits'
import { ErrorState } from '#/components/layout/ErrorState'
import { Input } from '#/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '#/components/ui/popover'
import { cardSearchQuery } from '#/services/queries'
import type { Printing, GameId } from '#/services/types'

/** Search input over the catalogue that shows matching cards in a dropdown. */
export function CardSearchBox({ autoFocus, gameId, initialQuery = '', onPick, placeholder = 'Search cards' }: {
  onPick: (card: Printing) => void;
  gameId?: GameId;
  placeholder?: string;
  initialQuery?: string;
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState(initialQuery)
  const [debounced, setDebounced] = useState(initialQuery)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(timeout)
  }, [query])

  const enabled = debounced.trim().length > 1
  const search = useQuery({
    ...cardSearchQuery(debounced, gameId),
    enabled,
  })
  const { data: results = [], isFetching } = search

  return (
    <Popover
      onOpenChange={setOpen}
      open={open && enabled}
    >
      <PopoverAnchor asChild>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            aria-label={placeholder}
            autoFocus={autoFocus}
            className="pl-9"
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            value={query}
          />

          {isFetching && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-72 p-1"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <ul className="max-h-72 overflow-y-auto">
          {results.map(card => (
            <li key={card.id}>
              <button
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onPick(card)
                  setOpen(false)
                  setQuery('')
                }}
                type="button"
              >
                <CardArt
                  card={card}
                  className="w-7 shrink-0"
                />

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{card.name}</span>

                  <span className="block truncate text-xs text-muted-foreground">{`${card.setName} · #${card.number}`}</span>
                </span>

                <Price
                  amount={card.prices.nonfoil}
                  className="text-xs"
                />
              </button>
            </li>
          ))}

          {search.isError && (
            <li>
              <ErrorState
                compact
                error={search.error}
                onRetry={() => void search.refetch()}
                title="Search failed"
              />
            </li>
          )}

          {query === debounced && !isFetching && !search.isError && results.length === 0 && <EmptyRow>No cards found.</EmptyRow>}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function EmptyRow({ children }: { children: ReactNode }) {
  return <li className="px-2 py-3 text-center text-sm text-muted-foreground">{children}</li>
}
