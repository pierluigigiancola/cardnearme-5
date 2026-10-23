import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, useParams } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useState } from 'react'

import { TradeStatusPill } from '#/components/trading/TradeStatusPill'
import { TraderAvatar } from '#/components/trading/TraderAvatar'
import { Input } from '#/components/ui/input'
import { formatRelative } from '#/lib/format'
import { cn } from '#/lib/utils'
import { chatsQuery } from '#/services/queries'
import type { ChatSummary, UserId } from '#/services/types'

export const Route = createFileRoute('/x/inbox')({
  loader: async ({ context: { queryClient, user } }) => {
    await queryClient.ensureQueryData(chatsQuery(user.id))
  },
  head: () => ({ meta: [{ title: 'Inbox | CardNearMe' }] }),
  component: InboxLayout,
})

function preview({ lastMessage: message, partner }: ChatSummary, me: UserId) {
  if (!message) return 'No messages yet'
  const who = message.author === me ? 'You' : partner.username
  switch (message.kind) {
    case 'text': return message.author === me ? `You: ${message.body}` : message.body
    case 'trade': return `${who} proposed a trade`
    case 'event': return `${who} ${message.body}`
  }
}

function InboxLayout() {
  const { user } = Route.useRouteContext()
  const { data: chats } = useSuspenseQuery(chatsQuery(user.id))
  const chatId = useParams({
    select: params => params.chatId,
    strict: false,
  })
  const [query, setQuery] = useState('')
  const visible = chats.filter(chat => chat.partner.username.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="page-wrap py-6">
      <div className="grid h-[calc(100dvh-11rem)] min-h-[520px] overflow-hidden rounded-2xl border bg-card md:grid-cols-[320px_1fr]">
        <aside className={cn('flex min-h-0 flex-col border-r', chatId && 'hidden md:flex')}>
          <div className="space-y-3 border-b p-4">
            <h1 className="text-xl font-extrabold">Inbox</h1>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                aria-label="Search conversations"
                className="pl-9"
                onChange={event => setQuery(event.target.value)}
                placeholder="Search traders"
                value={query}
              />
            </div>
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {visible.map(chat => (
              <li key={chat.id}>
                <Link
                  activeProps={{ className: 'bg-accent' }}
                  className="flex gap-3 border-b px-4 py-3 transition hover:bg-accent/60"
                  params={{ chatId: chat.id }}
                  to="/x/inbox/$chatId"
                >
                  <TraderAvatar
                    className="size-10"
                    hue={chat.partner.avatarHue}
                    online={chat.partner.online}
                    username={chat.partner.username}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn('truncate font-semibold', chat.unread > 0 && 'text-foreground')}>{chat.partner.username}</span>

                      {chat.tradeStatus && <TradeStatusPill status={chat.tradeStatus} />}

                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{formatRelative(chat.updatedAt)}</span>
                    </span>

                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={cn('truncate text-sm', chat.unread > 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}>{preview(chat, user.id)}</span>

                      {chat.unread > 0 && <span className="ml-auto shrink-0 rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground tabular-nums">{chat.unread}</span>}
                    </span>
                  </span>
                </Link>
              </li>
            ))}

            {visible.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">
                {chats.length === 0 ? 'No conversations yet. Message a trader from their profile or a match.' : 'No traders match your search.'}
              </li>
            )}
          </ul>
        </aside>

        <section className={cn('flex min-h-0 min-w-0 flex-col', !chatId && 'hidden md:flex')}>
          <Outlet />
        </section>
      </div>
    </div>
  )
}
