import type { AppNotification, ChatSummary, Trade, UserId } from '../../types'
import { compare } from '../queryHelpers'
import { participant, usernameOf } from '../store'
import type { ChatRecord } from '../store'

import { now } from './context'
import type { NewMessage, TraderContext } from './context'

/** Chats, Trades and notifications of the signed-in Trader, shared by several services. */

/** Mock partners accept the Trader's proposals after this long. */
export const PARTNER_REPLY_MS = 20_000

export function partnerIn(chat: ChatRecord, me: UserId) {
  return chat.traders[0] === me ? chat.traders[1] : chat.traders[0]
}

export function myChats({ me, store }: TraderContext) {
  return store.chats.filter(chat => chat.traders.includes(me))
}

export function findChat(ctx: TraderContext, chatId: string) {
  return myChats(ctx).find(candidate => candidate.id === chatId)
}

export function requireChat(ctx: TraderContext, chatId: string) {
  const chat = findChat(ctx, chatId)
  if (!chat) throw new Error('Conversation not found')
  return chat
}

/** The conversation with a Trader, started if needed. */
export function chatWith(ctx: TraderContext, partner: UserId) {
  if (partner === ctx.me) throw new Error('You cannot trade with yourself')
  participant(ctx.store, partner)
  let chat = myChats(ctx).find(candidate => candidate.traders.includes(partner))
  if (!chat) {
    chat = {
      id: ctx.id('chat'),
      lastReadAt: {
        [ctx.me]: now(),
        [partner]: now(),
      },
      messages: [],
      traders: [ctx.me, partner],
    }
    ctx.store.chats.push(chat)
  }
  return chat
}

export function post(ctx: TraderContext, chat: ChatRecord, message: NewMessage) {
  chat.messages.push({
    ...message,
    chatId: chat.id,
    id: ctx.id('msg'),
    sentAt: now(),
  })
  chat.lastReadAt[message.author] = now()
}

export function notify(ctx: TraderContext, notification: Omit<AppNotification, 'createdAt' | 'id' | 'readAt'>) {
  ctx.trader.notifications.push({
    ...notification,
    createdAt: now(),
    id: ctx.id('note'),
    readAt: null,
  })
}

export function summarise(ctx: TraderContext, chat: ChatRecord): ChatSummary {
  const lastMessage = chat.messages.at(-1) ?? null
  const lastReadAt = chat.lastReadAt[ctx.me] ?? ''
  const latestTrade = ctx.store.trades
    .filter(trade => trade.chatId === chat.id)
    .sort((a, b) => compare(a.createdAt, b.createdAt, 'desc'))
    .at(0)
  return {
    id: chat.id,
    lastMessage,
    partner: participant(ctx.store, partnerIn(chat, ctx.me)),
    tradeStatus: latestTrade?.status ?? null,
    unread: chat.messages.filter(message => message.author !== ctx.me && message.sentAt > lastReadAt).length,
    updatedAt: lastMessage?.sentAt ?? lastReadAt,
  }
}

export function requireTrade({ me, store }: TraderContext, tradeId: string) {
  const trade = store.trades.find(candidate => candidate.id === tradeId)
  if (!trade || (trade.proposer !== me && trade.recipient !== me)) throw new Error('Trade not found')
  return trade
}

export function partnerOf({ me }: TraderContext, trade: Trade) {
  return trade.proposer === me ? trade.recipient : trade.proposer
}

/**
 * Mock partners accept the Trader's proposals after PARTNER_REPLY_MS, in
 * development only, so a deployed mock never answers on someone's behalf.
 */
export function runPartners(ctx: TraderContext) {
  if (!import.meta.env.DEV) return
  const cutoff = Date.now() - PARTNER_REPLY_MS
  for (const trade of ctx.store.trades) {
    if (trade.status !== 'pending' || trade.proposer !== ctx.me || Date.parse(trade.updatedAt) > cutoff) continue
    const chat = findChat(ctx, trade.chatId)
    if (!chat) continue
    trade.status = 'accepted'
    trade.awaiting = null
    trade.updatedAt = now()
    post(ctx, chat, {
      author: trade.recipient,
      body: 'accepted the trade',
      kind: 'event',
    })
    post(ctx, chat, {
      author: trade.recipient,
      body: 'Sounds good, see you there!',
      kind: 'text',
    })
    notify(ctx, {
      actor: trade.recipient,
      body: 'Meet up and mark it completed once you have swapped cards.',
      href: `/x/inbox/${chat.id}`,
      kind: 'trade',
      title: `${usernameOf(ctx.store, trade.recipient)} accepted your trade`,
    })
  }
}
