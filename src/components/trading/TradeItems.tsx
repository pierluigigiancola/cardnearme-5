import { Link } from '@tanstack/react-router'
import { ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'

import { useRequireAuth } from '#/auth/AuthGate'
import { CardArt } from '#/components/cards/CardArt'
import { ConditionBadge, FinishBadge, Price } from '#/components/cards/CardBits'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatRelative } from '#/lib/format'
import type { TradeItem, ViewMode } from '#/services/types'

export function TradeItems({ items, view }: {
  items: TradeItem[];
  view: ViewMode
}) {
  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No cards match these filters yet.</p>
  }
  return view === 'table' ? <TradeItemTable items={items} /> : <TradeItemGrid items={items} />
}

function TradeButton({ item }: { item: TradeItem }) {
  const requireAuth = useRequireAuth()
  return (
    <Button
      className="w-full"
      onClick={() => requireAuth('trade', () => {
        // Ticket 02: open the trade builder pre-filled with this item.
        toast.info(`Trade builder for ${item.card.name} arrives in ticket 02`)
      })}
      size="sm"
    >
      <ArrowLeftRight />
      Trade
    </Button>
  )
}

function CardLink({ item, children }: {
  item: TradeItem;
  children: React.ReactNode
}) {
  return (
    <Link
      params={{
        card: item.card.slug,
        game: item.card.gameId,
        number: item.card.number,
        set: item.card.setCode,
      }}
      to="/sets/$game/$set/$card/$number"
    >
      {children}
    </Link>
  )
}

function TradeItemGrid({ items }: { items: TradeItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {items.map(item => (
        <li
          className="flex flex-col gap-2 rounded-xl border bg-card p-2"
          key={item.id}
        >
          <CardLink item={item}>
            <CardArt
              card={item.card}
              finish={item.finish}
            />
          </CardLink>

          <div className="flex items-center gap-1.5">
            <ConditionBadge condition={item.condition} />

            <FinishBadge finish={item.finish} />

            <span className="text-xs text-muted-foreground uppercase">{item.language}</span>

            <Price
              amount={item.price}
              className="ml-auto text-sm"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Link
              className="truncate font-semibold text-foreground hover:underline"
              params={{ username: item.ownerUsername }}
              to="/users/$username"
            >
              {item.ownerUsername}
            </Link>

            <span>{formatRelative(item.updatedAt)}</span>
          </div>

          <TradeButton item={item} />
        </li>
      ))}
    </ul>
  )
}

function TradeItemTable({ items }: { items: TradeItem[] }) {
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Card</TableHead>

            <TableHead>Set</TableHead>

            <TableHead>Cond.</TableHead>

            <TableHead className="text-right">Qty</TableHead>

            <TableHead className="text-right">Price</TableHead>

            <TableHead>Trader</TableHead>

            <TableHead />
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map(item => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <CardLink item={item}>{item.card.name}</CardLink>

                {' '}

                <FinishBadge finish={item.finish} />
              </TableCell>

              <TableCell className="text-muted-foreground">{item.card.setName}</TableCell>

              <TableCell>
                <ConditionBadge condition={item.condition} />
              </TableCell>

              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>

              <TableCell className="text-right">
                <Price amount={item.price} />
              </TableCell>

              <TableCell>
                <Link
                  className="hover:underline"
                  params={{ username: item.ownerUsername }}
                  to="/users/$username"
                >
                  {item.ownerUsername}
                </Link>
              </TableCell>

              <TableCell className="w-28">
                <TradeButton item={item} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
