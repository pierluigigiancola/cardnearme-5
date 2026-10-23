import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronsLeft, ChevronsRight, Minus, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Price } from '#/components/cards/CardBits'
import { ErrorState } from '#/components/layout/ErrorState'
import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from '#/lib/utils'
import { cardSearchQuery } from '#/services/queries'
import type { Card, Finish } from '#/services/types'

export const Route = createFileRoute('/swap-calculator')({
  head: () => ({ meta: [{ title: 'Trade value calculator | CardNearMe' }] }),
  component: SwapCalculator,
})

interface Line {
  id: string
  card: Card
  finish: Finish
  quantity: number
}

const lineValue = (line: Line) => (line.card.prices[line.finish] ?? line.card.prices.nonfoil ?? 0) * line.quantity

function SwapCalculator() {
  const [left, setLeft] = useState<Line[]>([])
  const [right, setRight] = useState<Line[]>([])
  const leftTotal = left.reduce((sum, line) => sum + lineValue(line), 0)
  const rightTotal = right.reduce((sum, line) => sum + lineValue(line), 0)
  const difference = rightTotal - leftTotal

  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{ label: 'Swap calculator' }]}
        description="Calculate fair trade values and compare card prices before you swap."
        title="Swap calculator"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TradeSide
          lines={left}
          onChange={setLeft}
          title="You give"
        />

        <TradeSide
          lines={right}
          onChange={setRight}
          title="You get"
        />
      </div>

      <div className="mt-6 grid grid-cols-3 items-center rounded-xl border bg-card p-4">
        <Price
          amount={leftTotal}
          className="text-xl"
        />

        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <ChevronsLeft className={cn(difference < 0 && 'text-have')} />

          <Price
            amount={Math.abs(difference)}
            className={cn('text-xl', difference === 0 && 'text-muted-foreground')}
          />

          <ChevronsRight className={cn(difference > 0 && 'text-have')} />
        </div>

        <Price
          amount={rightTotal}
          className="text-right text-xl"
        />
      </div>

      <p className="mt-2 text-center text-sm text-muted-foreground">
        {difference === 0
          ? 'Even trade.'
          : difference > 0
            ? 'You receive more value — consider adding cash or cards on your side.'
            : 'You give more value — ask for cash or another card to balance.'}
      </p>
    </div>
  )
}

function TradeSide({ lines, onChange, title }: {
  title: string;
  lines: Line[];
  onChange: (lines: Line[]) => void
}) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [finish, setFinish] = useState<Finish>('nonfoil')
  const search = useQuery({
    ...cardSearchQuery(debounced),
    enabled: debounced.trim().length > 1,
  })
  const results = search.data ?? []

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(q), 200)
    return () => clearTimeout(timeout)
  }, [q])

  const nextId = useRef(0)

  const add = (card: Card) => {
    onChange([...lines, {
      card,
      finish: card.finishes.includes(finish) ? finish : 'nonfoil',
      id: `${card.id}-${nextId.current++}`,
      quantity,
    }])
    setQ('')
    setQuantity(1)
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-bold">{title}</h2>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center rounded-md border">
          <Button
            aria-label="Decrease quantity"
            onClick={() => setQuantity(value => Math.max(1, value - 1))}
            size="icon"
            variant="ghost"
          >
            <Minus />
          </Button>

          <span className="w-8 text-center tabular-nums">{quantity}</span>

          <Button
            aria-label="Increase quantity"
            onClick={() => setQuantity(value => value + 1)}
            size="icon"
            variant="ghost"
          >
            <Plus />
          </Button>
        </div>

        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            aria-label={`Search a card to add to ${title}`}
            className="pl-9"
            onChange={event => setQ(event.target.value)}
            placeholder="Search for a card"
            value={q}
          />

          {search.isError && q.trim().length > 1 && (
            <div className="absolute top-full right-0 left-0 z-20 mt-1 rounded-xl border bg-popover p-1 shadow-xl">
              <ErrorState
                compact
                error={search.error}
                onRetry={() => void search.refetch()}
                title="Search failed"
              />
            </div>
          )}

          {results.length > 0 && q.trim().length > 1 && (
            <ul className="absolute top-full right-0 left-0 z-20 mt-1 max-h-72 overflow-auto rounded-xl border bg-popover p-1 shadow-xl">
              {results.map(card => (
                <li key={card.id}>
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => add(card)}
                    type="button"
                  >
                    <span className="flex-1 truncate">{card.name}</span>

                    <span className="text-xs text-muted-foreground uppercase">{card.setCode}</span>

                    <Price amount={card.prices.nonfoil} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Select
          onValueChange={value => setFinish(value === 'foil' ? 'foil' : value === 'etched' ? 'etched' : 'nonfoil')}
          value={finish}
        >
          <SelectTrigger
            aria-label="Finish"
            className="w-32"
          >
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="nonfoil">Non-foil</SelectItem>

            <SelectItem value="foil">Foil</SelectItem>

            <SelectItem value="etched">Etched</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {lines.length === 0
        ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Add cards to this side.</p>
        : (
          <ul className="divide-y">
            {lines.map(line => (
              <li
                className="flex items-center gap-2 py-2 text-sm"
                key={line.id}
              >
                <span className="w-6 text-muted-foreground tabular-nums">
                  {line.quantity}
                  ×
                </span>

                <span className="flex-1 truncate">
                  {line.card.name}

                  {line.finish !== 'nonfoil' && <span className="ml-1 text-xs text-match capitalize">{line.finish}</span>}
                </span>

                <Price amount={lineValue(line)} />

                <Button
                  aria-label={`Remove ${line.card.name}`}
                  onClick={() => onChange(lines.filter(other => other.id !== line.id))}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
    </section>
  )
}
