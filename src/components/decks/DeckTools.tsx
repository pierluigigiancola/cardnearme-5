import { Link } from '@tanstack/react-router'
import { Heart, MessageSquare, RotateCcw, Shuffle } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CardArt } from '#/components/cards/CardArt'
import { Price } from '#/components/cards/CardBits'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { distribution, drawProbability, expandDeck, shuffle } from '#/lib/deckMath'
import type { Comparison } from '#/lib/deckMath'
import { formatRelative } from '#/lib/format'
import type { Printing, Deck, DeckCard } from '#/services/types'

export function DeckTile({ deck }: { deck: Deck }) {
  const cover = deck.cards.at(0)?.card
  return (
    <Link
      className="group flex flex-col gap-2 rounded-xl border bg-card p-3 transition hover:border-primary/60"
      params={{
        deckId: deck.id,
        format: deck.format.toLowerCase(),
        game: deck.gameId,
      }}
      to="/decks/$game/$format/$deckId"
    >
      {cover && (
        <div className="h-28 overflow-hidden rounded-lg">
          <CardArt
            card={cover}
            className="-mt-6 rounded-none"
          />
        </div>
      )}

      <p className="truncate font-semibold group-hover:text-primary">{deck.name}</p>

      <p className="text-xs text-muted-foreground">
        {deck.format}

        {' · by '}

        {deck.ownerUsername}

        {' · '}

        {formatRelative(deck.updatedAt)}
      </p>

      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Heart className="size-3" />

          {deck.likes}
        </span>

        <span className="flex items-center gap-1">
          <MessageSquare className="size-3" />

          {deck.commentCount}
        </span>
      </div>
    </Link>
  )
}

export function deckValue(entries: DeckCard[]) {
  return entries.reduce((sum, entry) => sum + (entry.card.prices.nonfoil ?? 0) * entry.quantity, 0)
}

const isLand = (card: Printing) => card.typeLine.includes('Land')

export function ManaCurve({ entries }: { entries: DeckCard[] }) {
  const buckets = Array.from({ length: 8 }, (_, cost) =>
    entries
      .filter(entry => !isLand(entry.card) && Math.min(entry.card.cost, 7) === cost)
      .reduce((sum, entry) => sum + entry.quantity, 0))
  const max = Math.max(1, ...buckets)
  const spells = entries.filter(entry => !isLand(entry.card))
  const average = spells.reduce((sum, entry) => sum + entry.card.cost * entry.quantity, 0)
    / Math.max(1, spells.reduce((sum, entry) => sum + entry.quantity, 0))

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">
        Mana curve · avg
        {' '}

        {average.toFixed(1)}
      </p>

      <div className="flex h-28 items-end gap-1.5">
        {buckets.map((count, cost) => (
          <div
            className="flex flex-1 flex-col items-center gap-1"
            key={cost}
          >
            <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>

            <div
              className="w-full rounded-t bg-primary/70"
              style={{ height: `${Math.round((count / max) * 80)}px` }}
            />

            <span className="text-xs font-semibold">{cost === 7 ? '7+' : cost}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TypeBreakdown({ entries }: { entries: DeckCard[] }) {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const type = entry.card.typeLine.split(' — ')[0] ?? entry.card.typeLine
    counts.set(type, (counts.get(type) ?? 0) + entry.quantity)
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Card types</p>

      <ul className="space-y-1 text-sm">
        {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => (
          <li
            className="flex justify-between"
            key={type}
          >
            <span className="text-muted-foreground">{type}</span>

            <span className="font-semibold tabular-nums">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HandSimulator({ entries }: { entries: DeckCard[] }) {
  const library = useMemo(() => expandDeck(entries.filter(entry => entry.section === 'mainboard')), [entries])
  const [deck, setDeck] = useState(() => shuffle(library))
  const [handSize, setHandSize] = useState(7)
  const [mulligans, setMulligans] = useState(0)
  const [removed, setRemoved] = useState<number[]>([])

  const hand = deck.slice(0, handSize).map((card, index) => ({
    card,
    index,
  }))
    .filter(entry => !removed.includes(entry.index))
  const lands = hand.filter(entry => isLand(entry.card)).length
  const handValue = hand.reduce((sum, entry) => sum + (entry.card.prices.nonfoil ?? 0), 0)
  const verdict = lands >= 2 && lands <= 5 ? 'Keepable' : 'Mulligan'

  const reset = (nextMulligans: number) => {
    setDeck(shuffle(library))
    setHandSize(7)
    setRemoved([])
    setMulligans(nextMulligans)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => reset(0)}
          size="sm"
          variant="outline"
        >
          <RotateCcw />
          Reset
        </Button>

        <Button
          onClick={() => reset(mulligans)}
          size="sm"
        >
          <Shuffle />
          New hand
        </Button>

        <Button
          onClick={() => reset(mulligans + 1)}
          size="sm"
          variant="outline"
        >
          Mulligan (
          {mulligans}
          )
        </Button>

        {[1, 3, 5].map(count => (
          <Button
            disabled={handSize >= deck.length}
            key={count}
            onClick={() => setHandSize(size => Math.min(deck.length, size + count))}
            size="sm"
            variant="secondary"
          >
            Draw
            {' '}

            {count}
          </Button>
        ))}
      </div>

      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {hand.map(entry => (
          <li key={entry.index}>
            <button
              aria-label={`Remove ${entry.card.name} from hand`}
              className="block w-full transition hover:-translate-y-1"
              onClick={() => setRemoved(previous => [...previous, entry.index])}
              type="button"
            >
              <CardArt card={entry.card} />
            </button>
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat
          label="Verdict"
          value={verdict}
        />

        <Stat
          label="Lands"
          value={`${lands} / ${hand.length}`}
        />

        <Stat
          label="Remaining"
          value={String(deck.length - handSize)}
        />

        <Stat
          label="Hand value"
          value={<Price amount={handValue} />}
        />
      </dl>
    </div>
  )
}

function Stat({ label, value }: {
  label: string;
  value: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>

      <dd className="font-semibold">{value}</dd>
    </div>
  )
}

export function DrawOdds({ entries }: { entries: DeckCard[] }) {
  const mainboard = entries.filter(entry => entry.section === 'mainboard')
  const deckSize = mainboard.reduce((sum, entry) => sum + entry.quantity, 0)
  const landCount = mainboard.filter(entry => isLand(entry.card)).reduce((sum, entry) => sum + entry.quantity, 0)
  const [copies, setCopies] = useState(landCount || 4)
  const [draws, setDraws] = useState(7)
  const [want, setWant] = useState(2)
  const [comparison, setComparison] = useState<Comparison>('atLeast')

  const probability = drawProbability(deckSize, copies, draws, want, comparison)
  const bars = distribution(deckSize, copies, draws)
  const maxBar = Math.max(...bars, 0.0001)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField
          label="Copies in deck"
          max={deckSize}
          onChange={setCopies}
          value={copies}
        />

        <NumberField
          label="Cards drawn"
          max={deckSize}
          onChange={setDraws}
          value={draws}
        />

        <label className="space-y-1 text-xs text-muted-foreground">
          Want
          <Select
            onValueChange={value => setComparison(value === 'exactly' ? 'exactly' : value === 'atMost' ? 'atMost' : 'atLeast')}
            value={comparison}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="atLeast">At least</SelectItem>

              <SelectItem value="exactly">Exactly</SelectItem>

              <SelectItem value="atMost">At most</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <NumberField
          label="Copies"
          max={Math.min(copies, draws)}
          onChange={setWant}
          value={want}
        />
      </div>

      <p className="text-3xl font-extrabold text-primary tabular-nums">
        {(probability * 100).toFixed(1)}
        %
      </p>

      <p className="text-sm text-muted-foreground">
        Chance of drawing
        {' '}

        {comparison === 'atLeast' ? 'at least' : comparison === 'atMost' ? 'at most' : 'exactly'}

        {' '}

        {want}

        {' of '}

        {copies}

        {' copies in '}

        {draws}

        {' cards from a '}

        {deckSize}
        -card deck.
      </p>

      <div className="flex h-24 items-end gap-1">
        {bars.map((value, k) => (
          <div
            className="flex flex-1 flex-col items-center gap-1"
            key={k}
            title={`P(X = ${k}) = ${(value * 100).toFixed(1)}%`}
          >
            <div
              className="w-full rounded-t bg-match/70"
              style={{ height: `${Math.round((value / maxBar) * 72)}px` }}
            />

            <span className="text-[10px] font-semibold">{k}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NumberField({ label, max, onChange, value }: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void
}) {
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      {label}

      <Input
        max={max}
        min={0}
        onChange={event => onChange(Math.max(0, Math.min(max, Number(event.target.value) || 0)))}
        type="number"
        value={value}
      />
    </label>
  )
}
