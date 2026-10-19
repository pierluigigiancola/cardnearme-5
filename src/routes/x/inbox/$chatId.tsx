import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft, ArrowLeftRight, Eye, Loader2, SendHorizonal, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useTradeBuilder } from '#/components/trading/TradeBuilder'
import { TradeCard } from '#/components/trading/TradeCard'
import { TraderAvatar } from '#/components/trading/TraderAvatar'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { formatRelative } from '#/lib/format'
import { cn } from '#/lib/utils'
import { useWorkspaceMutation } from '#/services/mutations'
import { chatThreadQuery, storesQuery } from '#/services/queries'
import type { ChatMessage } from '#/services/types'

export const Route = createFileRoute('/x/inbox/$chatId')({
  loader: async ({ context: { queryClient, user }, params }) => {
    const [thread] = await Promise.all([
      queryClient.ensureQueryData(chatThreadQuery(user.id, params.chatId)),
      queryClient.ensureQueryData(storesQuery()),
    ])
    if (!thread) throw notFound()
    return { partner: thread.chat.partner.username }
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.partner} | Inbox | CardNearMe` : 'Inbox | CardNearMe' }] }),
  component: ConversationPage,
  notFoundComponent: () => <p className="m-auto p-8 text-muted-foreground">This conversation does not exist.</p>,
})

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
})
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
})

function ConversationPage() {
  const { user } = Route.useRouteContext()
  const { chatId } = Route.useParams()
  const { data: thread } = useSuspenseQuery(chatThreadQuery(user.id, chatId))
  const { data: stores } = useSuspenseQuery(storesQuery())
  const openTradeBuilder = useTradeBuilder()
  const scroller = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const send = useWorkspaceMutation((services, body: string) => services.chat.sendMessage(chatId, body))
  const markRead = useWorkspaceMutation(services => services.chat.markRead(chatId))
  const { mutate: markReadMutate } = markRead
  const unread = thread?.chat.unread ?? 0
  const messageCount = thread?.messages.length ?? 0

  useEffect(() => {
    if (unread > 0) markReadMutate(undefined)
  }, [markReadMutate, unread])

  useEffect(() => {
    const element = scroller.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messageCount, chatId])

  if (!thread) return <p className="m-auto p-8 text-muted-foreground">This conversation does not exist.</p>

  const { chat, messages, trades } = thread
  const partner = chat.partner
  const partnerStores = partner.storeSlugs.flatMap(slug => stores.find(store => store.slug === slug) ?? [])
  const latestTrade = [...messages].reverse().find(message => message.kind === 'trade')

  const submit = () => {
    const body = draft.trim()
    if (!body) return
    send.mutate(body, { onSuccess: () => setDraft('') })
  }

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <Button
          aria-label="Back to conversations"
          asChild
          className="md:hidden"
          size="icon-sm"
          variant="ghost"
        >
          <Link to="/x/inbox">
            <ArrowLeft />
          </Link>
        </Button>

        <TraderAvatar
          className="size-10"
          hue={partner.avatarHue}
          online={partner.online}
          username={partner.username}
        />

        <div className="min-w-0 flex-1">
          <Link
            className="font-semibold hover:underline"
            params={{ username: partner.username }}
            to="/users/$username"
          >
            {partner.username}
          </Link>

          <p className="truncate text-xs text-muted-foreground">
            {partner.online ? 'Online now' : `Last seen ${formatRelative(partner.lastSeenAt)}`}

            {partnerStores.length > 0 && ` · Trades at ${partnerStores.map(store => store.name).join(', ')}`}
          </p>
        </div>

        <div className="flex gap-2">
          {latestTrade && (
            <Button
              onClick={() => document.getElementById(`trade-${latestTrade.tradeId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              })}
              size="sm"
              variant="ghost"
            >
              <Eye />
              View trade
            </Button>
          )}

          <Button
            onClick={() => openTradeBuilder({
              partner: partner.username,
              useMatches: true,
            })}
            size="sm"
            variant="outline"
          >
            <Sparkles />
            Matches
          </Button>

          <Button
            onClick={() => openTradeBuilder({ partner: partner.username })}
            size="sm"
          >
            <ArrowLeftRight />
            Trade
          </Button>
        </div>
      </header>

      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
        ref={scroller}
      >
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{`Say hi to ${partner.username}, or propose a trade.`}</p>}

        {messages.map((message, index) => {
          const previous = index > 0 ? messages.at(index - 1) : undefined
          const newDay = !previous || new Date(previous.sentAt).toDateString() !== new Date(message.sentAt).toDateString()
          return (
            <div key={message.id}>
              {newDay && <p className="py-2 text-center text-xs font-semibold text-muted-foreground">{dayFormatter.format(new Date(message.sentAt))}</p>}

              <Message
                me={user.username}
                message={message}
                trade={message.kind === 'trade' ? trades[message.tradeId] : undefined}
              />
            </div>
          )
        })}
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Textarea
          aria-label={`Message ${partner.username}`}
          className="max-h-40 min-h-10 resize-none"
          maxLength={2000}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="Write a message — Enter to send, Shift+Enter for a new line"
          rows={1}
          value={draft}
        />

        <Button
          aria-label="Send message"
          disabled={!draft.trim() || send.isPending}
          size="icon"
          type="submit"
        >
          {send.isPending ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
        </Button>
      </form>
    </>
  )
}

function Message({ me, message, trade }: {
  message: ChatMessage;
  me: string;
  trade?: Parameters<typeof TradeCard>[0]['trade']
}) {
  const mine = message.author === me
  const time = timeFormatter.format(new Date(message.sentAt))

  if (message.kind === 'event') {
    return (
      <p className="text-center text-xs text-muted-foreground">
        <span className="font-semibold">{mine ? 'You' : message.author}</span>

        {` ${message.body} · ${time}`}
      </p>
    )
  }
  if (message.kind === 'trade') {
    return (
      <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
        {trade
          ? (
            <TradeCard
              me={me}
              trade={trade}
            />
          )
          : <p className="text-xs text-muted-foreground">Trade no longer available</p>}
      </div>
    )
  }
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted')}>
        <p className="whitespace-pre-wrap">{message.body}</p>

        <p className={cn('mt-0.5 text-right text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{time}</p>
      </div>
    </div>
  )
}
