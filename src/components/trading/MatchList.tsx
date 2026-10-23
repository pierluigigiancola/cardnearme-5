import { Link } from '@tanstack/react-router'
import { ArrowLeftRight, MessageSquare, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

import { useTradeBuilder } from './TradeBuilder'
import { TraderAvatar } from './TraderAvatar'
import { useStartChat } from './useStartChat'

import { useRequireAuth } from '#/auth/AuthGate'
import { CardArt } from '#/components/cards/CardArt'
import { Button } from '#/components/ui/button'
import type { TradeMatch } from '#/services/types'

/** Traders whose lists match the viewer's, with shortcuts to trade or chat. */
export function MatchList({ empty, matches, storeNames }: {
  matches: TradeMatch[];
  /** Store names by slug, to label shared stores. */
  storeNames?: Record<string, string>;
  empty?: ReactNode
}) {
  const requireAuth = useRequireAuth()
  const openTradeBuilder = useTradeBuilder()
  const { isPending, startChat } = useStartChat()

  if (matches.length === 0) {
    return empty ?? (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
        <Sparkles className="size-6 text-match" />

        <p className="font-semibold">No matches yet</p>

        <p className="max-w-sm text-sm text-muted-foreground">Add cards to your wants and haves — we match them with traders at your stores as they list cards.</p>
      </div>
    )
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {matches.map(match => (
        <li
          className="flex flex-col gap-3 rounded-xl border bg-card p-4"
          key={match.partner.id}
        >
          <div className="flex items-center gap-3">
            <TraderAvatar
              className="size-10"
              hue={match.partner.avatarHue}
              online={match.partner.online}
              username={match.partner.username}
            />

            <div className="min-w-0 flex-1">
              <Link
                className="font-semibold hover:underline"
                params={{ username: match.partner.username }}
                to="/users/$username"
              >
                {match.partner.username}
              </Link>

              {match.sharedStoreSlugs.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  {'Trades at '}

                  {match.sharedStoreSlugs.map(slug => storeNames?.[slug] ?? slug).join(', ')}
                </p>
              )}
            </div>

            <span className="rounded-full bg-match/15 px-2 py-0.5 text-xs font-bold text-match">
              {match.theyHave.length + match.theyWant.length}

              {' '}
              matches
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <MatchColumn
              cards={match.theyHave.map(item => item.card)}
              title="They have"
            />

            <MatchColumn
              cards={match.theyWant.map(item => item.card)}
              title="They want"
            />
          </div>

          <div className="mt-auto flex gap-2">
            <Button
              className="flex-1"
              onClick={() => requireAuth('trade', () => openTradeBuilder({
                partner: match.partner.id,
                useMatches: true,
              }))}
              size="sm"
            >
              <ArrowLeftRight />
              Trade
            </Button>

            <Button
              disabled={isPending}
              onClick={() => requireAuth('message', () => startChat(match.partner.id))}
              size="sm"
              variant="outline"
            >
              <MessageSquare />
              Message
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function MatchColumn({ cards, title }: {
  title: string;
  cards: TradeMatch['theyHave'][number]['card'][]
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {title}

        {` (${cards.length})`}
      </p>

      {cards.length === 0
        ? <p className="text-xs text-muted-foreground">—</p>
        : (
          <ul className="space-y-1">
            {cards.slice(0, 3).map(card => (
              <li
                className="flex items-center gap-2"
                key={card.id}
              >
                <CardArt
                  card={card}
                  className="w-6 shrink-0"
                />

                <span className="truncate">{card.name}</span>
              </li>
            ))}

            {cards.length > 3 && <li className="text-xs text-muted-foreground">{`+${cards.length - 3} more`}</li>}
          </ul>
        )}
    </div>
  )
}
