import { Link } from '@tanstack/react-router'

import { CardArt } from './CardArt'
import { Price, PriceChange, RarityLabel } from './CardBits'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type { Card, ViewMode } from '#/services/types'

function CardPageLink({ card, children, className }: {
  card: Card;
  children: React.ReactNode;
  className?: string
}) {
  return (
    <Link
      className={className}
      params={{
        card: card.slug,
        game: card.gameId,
        number: card.number,
        set: card.setCode,
      }}
      to="/sets/$game/$set/$card/$number"
    >
      {children}
    </Link>
  )
}

export function CardList({ cards, view }: {
  cards: Card[];
  view: ViewMode
}) {
  if (cards.length === 0) {
    return <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No cards match these filters.</p>
  }

  if (view === 'table') {
    return (
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>

              <TableHead>Name</TableHead>

              <TableHead>Type</TableHead>

              <TableHead>Rarity</TableHead>

              <TableHead className="text-right">Price</TableHead>

              <TableHead className="text-right">7d</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {cards.map(card => (
              <TableRow key={card.id}>
                <TableCell className="text-muted-foreground tabular-nums">{card.number}</TableCell>

                <TableCell className="font-semibold">
                  <CardPageLink
                    card={card}
                    className="hover:text-primary"
                  >
                    {card.name}
                  </CardPageLink>
                </TableCell>

                <TableCell className="text-muted-foreground">{card.typeLine}</TableCell>

                <TableCell>
                  <RarityLabel rarity={card.rarity} />
                </TableCell>

                <TableCell className="text-right">
                  <Price amount={card.prices.nonfoil} />
                </TableCell>

                <TableCell className="text-right">
                  <PriceChange value={card.priceChange7d} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map(card => (
        <li key={card.id}>
          <CardPageLink
            card={card}
            className="group block space-y-1.5"
          >
            <CardArt
              card={card}
              className="transition group-hover:-translate-y-1"
            />

            <p className="truncate text-sm font-semibold group-hover:text-primary">{card.name}</p>

            <div className="flex items-center justify-between text-xs">
              <RarityLabel rarity={card.rarity} />

              <Price amount={card.prices.nonfoil} />
            </div>
          </CardPageLink>
        </li>
      ))}
    </ul>
  )
}
