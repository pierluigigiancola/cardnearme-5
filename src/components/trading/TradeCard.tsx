import { Link } from '@tanstack/react-router'
import { ArrowLeftRight, CalendarClock, Check, CheckCheck, Coins, MapPin, Pencil, Undo2, X } from 'lucide-react'
import { toast } from 'sonner'

import { useTradeBuilder } from './TradeBuilder'
import { TradeStatusPill } from './TradeStatusPill'

import { CardArt } from '#/components/cards/CardArt'
import { ConditionBadge, FinishBadge, Price } from '#/components/cards/CardBits'
import { Button } from '#/components/ui/button'
import { hasConfirmed, marketValue, tradeFromPerspective } from '#/domain'
import { formatPrice, formatRelative } from '#/lib/format'
import { usePricingSource } from '#/lib/pricing'
import { cn } from '#/lib/utils'
import { useWorkspaceMutation } from '#/services/mutations'
import type { Trade, TradeLine, UserId } from '#/services/types'

const meetFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
  weekday: 'short',
})

/**
 * A trade proposal as it appears in the conversation, with the actions open to the viewer.
 * The Trade refers to both Traders by UserId; `partnerName` is the other Trader's username, for display.
 */
export function TradeCard({ me, partnerName, trade }: {
  trade: Trade;
  me: UserId;
  partnerName: string
}) {
  const source = usePricingSource()
  const sides = tradeFromPerspective(trade, me)
  const openTradeBuilder = useTradeBuilder()
  const action = useWorkspaceMutation((services, run: 'accept' | 'cancel' | 'confirm') => services.trades[run](trade.id))
  const awaitingMe = trade.status === 'pending' && trade.awaiting === me
  const iConfirmed = hasConfirmed(trade, me)
  const partnerConfirmed = hasConfirmed(trade, sides.partner)

  const run = (kind: 'accept' | 'cancel' | 'confirm', message: string) => {
    action.mutate(kind, { onSuccess: () => toast.success(message) })
  }

  return (
    <article
      className={cn('w-full max-w-2xl rounded-2xl border bg-card p-4 shadow-sm', awaitingMe && 'border-have/60', trade.status === 'cancelled' && 'opacity-75')}
      id={`trade-${trade.id}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <ArrowLeftRight className="size-4 text-primary" />

        <h3 className="font-bold">Trade proposal</h3>

        <TradeStatusPill status={trade.status} />

        <span className="ml-auto text-xs text-muted-foreground">
          {trade.proposer === me ? 'You proposed' : `${partnerName} proposed`}

          {' · '}

          {formatRelative(trade.updatedAt)}
        </span>
      </header>

      {(trade.meetup || trade.meetAt) && (
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {trade.meetup && (
            <span className="flex items-center gap-1">
              <MapPin className="size-4 text-muted-foreground" />
              Meet at

              {' '}

              {trade.meetup.kind === 'store'
                ? (
                  <Link
                    className="font-semibold text-primary hover:underline"
                    params={{ store: trade.meetup.storeSlug }}
                    to="/stores/$store"
                  >
                    {trade.meetup.name}
                  </Link>
                )
                : <span className="font-semibold">{trade.meetup.name}</span>}

              {trade.meetup.address && <span className="text-xs text-muted-foreground">{` · ${trade.meetup.address}`}</span>}
            </span>
          )}

          {trade.meetAt && (
            <span className="flex items-center gap-1">
              <CalendarClock className="size-4 text-muted-foreground" />

              {meetFormatter.format(new Date(trade.meetAt))}
            </span>
          )}
        </p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <TradeColumn
          lines={sides.give}
          title="You give"
        />

        <TradeColumn
          lines={sides.get}
          title="You get"
        />
      </div>

      {trade.cashPayer && trade.cashAmount > 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm">
          <Coins className="size-4 text-price" />

          {trade.cashPayer === me ? 'You add' : `${partnerName} adds`}

          <Price amount={trade.cashAmount} />
          in cash
        </p>
      )}

      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Your total</dt>

          <dd className="font-bold tabular-nums">{formatPrice(sides.myTotal, source)}</dd>
        </div>

        <div>
          <dt className="text-xs text-muted-foreground">
            {partnerName}
            &apos;s total
          </dt>

          <dd className="font-bold tabular-nums">{formatPrice(sides.theirTotal, source)}</dd>
        </div>

        <div>
          <dt className="text-xs text-muted-foreground">Difference</dt>

          <dd className={cn('font-bold tabular-nums', Math.abs(sides.difference) < 0.5 ? 'text-want' : 'text-have')}>
            {sides.difference > 0 ? '+' : ''}

            {formatPrice(sides.difference, source)}
          </dd>
        </div>
      </dl>

      {trade.note && <p className="mt-3 border-l-2 pl-3 text-sm text-muted-foreground italic">{trade.note}</p>}

      {(trade.status === 'accepted' || trade.status === 'completed') && (
        <ul
          aria-label="Confirmations"
          className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm"
        >
          <ConfirmationItem
            at={trade.confirmedAt[me]}
            who="You"
          />

          <ConfirmationItem
            at={trade.confirmedAt[sides.partner]}
            who={partnerName}
          />
        </ul>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-semibold text-muted-foreground">
          {trade.status === 'pending' && (awaitingMe ? 'Waiting for your answer' : `Awaiting @${partnerName}`)}

          {trade.status === 'accepted' && acceptedCopy(iConfirmed, partnerConfirmed, partnerName)}

          {trade.status === 'completed' && 'Completed — both of you confirmed, and the cards moved between your binders'}

          {trade.status === 'cancelled' && cancelledCopy(trade, me, partnerName)}
        </p>

        {awaitingMe && (
          <>
            <Button
              disabled={action.isPending}
              onClick={() => run('cancel', 'Trade declined')}
              size="sm"
              variant="ghost"
            >
              <X />
              Decline
            </Button>

            <Button
              onClick={() => openTradeBuilder({
                partner: sides.partner,
                trade,
              })}
              size="sm"
              variant="outline"
            >
              <Undo2 />
              Counter
            </Button>

            <Button
              disabled={action.isPending}
              onClick={() => run('accept', 'Trade accepted')}
              size="sm"
            >
              <Check />
              Accept
            </Button>
          </>
        )}

        {trade.status === 'pending' && !awaitingMe && (
          <>
            <Button
              disabled={action.isPending}
              onClick={() => run('cancel', 'Proposal withdrawn')}
              size="sm"
              variant="ghost"
            >
              <X />
              Withdraw
            </Button>

            <Button
              onClick={() => openTradeBuilder({
                partner: sides.partner,
                trade,
              })}
              size="sm"
              variant="outline"
            >
              <Pencil />
              Edit
            </Button>
          </>
        )}

        {trade.status === 'accepted' && (
          <>
            <Button
              disabled={action.isPending}
              onClick={() => run('cancel', 'Trade cancelled')}
              size="sm"
              variant="ghost"
            >
              <X />
              Cancel trade
            </Button>

            {!iConfirmed && (
              <Button
                disabled={action.isPending}
                onClick={() => run('confirm', partnerConfirmed ? 'Trade completed — binder updated' : 'Confirmed — waiting for the other Trader')}
                size="sm"
              >
                <CheckCheck />
                Confirm trade
              </Button>
            )}
          </>
        )}
      </footer>
    </article>
  )
}

function acceptedCopy(iConfirmed: boolean, partnerConfirmed: boolean, partnerName: string) {
  if (iConfirmed) return `You confirmed — waiting for @${partnerName} to confirm`
  if (partnerConfirmed) return `@${partnerName} confirmed — confirm once you have swapped the cards`
  return 'Accepted — meet up, swap the cards, then each of you confirms'
}

function ConfirmationItem({ at, who }: {
  who: string;
  at: string | undefined
}) {
  return (
    <li className={cn('flex items-center gap-1', at ? 'text-want' : 'text-muted-foreground')}>
      {at ? <Check className="size-4" /> : <CalendarClock className="size-4" />}

      {at ? `${who} confirmed ${formatRelative(at)}` : `${who}: not confirmed yet`}
    </li>
  )
}

/**
 * `proposer` is whoever made the latest offer, so the recipient cancelling is a decline and the
 * proposer cancelling is a withdrawal. A trade does not record whether it had been accepted before
 * it was cancelled, so "withdrew from" is worded to also fit a proposer cancelling after acceptance.
 */
function cancelledCopy(trade: Trade, me: UserId, partnerName: string) {
  if (!trade.cancelledBy) return 'This trade was cancelled'
  const withdrew = trade.cancelledBy === trade.proposer
  if (trade.cancelledBy === me) return withdrew ? 'You withdrew from this trade' : 'You declined this trade'
  return withdrew ? `${partnerName} withdrew from this trade` : `${partnerName} declined this trade`
}

function TradeColumn({ lines, title }: {
  title: string;
  lines: TradeLine[]
}) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center justify-between text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {title}

        <span className="font-normal normal-case">
          {'market '}

          <Price
            amount={marketValue(lines)}
            className="text-xs"
          />
        </span>
      </h4>

      {lines.length === 0 && <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">No cards</p>}

      <ul className="space-y-1.5">
        {lines.map(line => (
          <li
            className="flex items-center gap-2"
            key={line.id}
          >
            <CardArt
              card={line.card}
              className="w-8 shrink-0"
              finish={line.finish}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {line.quantity > 1 && <span className="text-muted-foreground">{`${line.quantity}× `}</span>}

                {line.card.name}
              </p>

              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ConditionBadge condition={line.condition} />

                <span className="uppercase">{line.language}</span>

                <FinishBadge finish={line.finish} />
              </p>
            </div>

            <div className="text-right text-xs">
              <Price amount={line.price * line.quantity} />

              {line.price !== line.marketPrice && (
                <p className="text-muted-foreground">
                  {'mkt '}

                  <Price
                    amount={line.marketPrice * line.quantity}
                    className="font-normal text-muted-foreground"
                  />
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
