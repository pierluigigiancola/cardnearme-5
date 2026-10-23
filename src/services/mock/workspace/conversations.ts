import type { AppNotification, ChatSummary, Trade, UserId } from '../../types'
import { compare } from '../queryHelpers'
import { participant, usernameOf } from '../store'
import type { ChatRecord } from '../store'

import { now } from './context'
import type { NewMessage, TraderContext } from './context'
import { acceptAs, confirmAs } from './lifecycle'

import { hasConfirmed } from '#/domain'

/** Chats, Trades and notifications of the signed-in Trader, shared by several services. */

/** Mock partners answer the Trader (accept, confirm) after this long. */
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
 * Mock partners, in development only, so a deployed mock never acts on
 * someone's behalf. After PARTNER_REPLY_MS they accept the Trader's
 * proposals (when the cards can be reserved) and confirm accepted Trades
 * they haven't confirmed yet. Confirming never completes a Trade alone: it
 * completes once the Trader has confirmed too (ADR 0003).
 */
export function runPartners(ctx: TraderContext) {
  if (!import.meta.env.DEV) return
  const cutoff = Date.now() - PARTNER_REPLY_MS
  for (const trade of ctx.store.trades) {
    if (Date.parse(trade.updatedAt) > cutoff || (trade.proposer !== ctx.me && trade.recipient !== ctx.me)) continue
    const chat = findChat(ctx, trade.chatId)
    if (!chat) continue
    const partner = partnerOf(ctx, trade)
    if (trade.status === 'pending' && trade.proposer === ctx.me) autoAccept(ctx, chat, trade, partner)
    else if (trade.status === 'accepted' && !hasConfirmed(trade, partner)) autoConfirm(ctx, chat, trade, partner)
  }
}

function autoAccept(ctx: TraderContext, chat: ChatRecord, trade: Trade, partner: UserId) {
  try {
    acceptAs(ctx.store, trade, partner)
  }
  catch {
    // The cards can't be reserved any more: leave the proposal pending.
    return
  }
  post(ctx, chat, {
    author: partner,
    body: 'accepted the trade',
    kind: 'event',
  })
  post(ctx, chat, {
    author: partner,
    body: 'Sounds good, see you there!',
    kind: 'text',
  })
  notify(ctx, {
    actor: partner,
    body: 'Meet up, swap the cards, then confirm the trade took place.',
    href: `/x/inbox/${chat.id}`,
    kind: 'trade',
    title: `${usernameOf(ctx.store, partner)} accepted your trade`,
  })
}

function autoConfirm(ctx: TraderContext, chat: ChatRecord, trade: Trade, partner: UserId) {
  confirmAs(ctx.store, trade, partner)
  const completed = trade.status === 'completed'
  post(ctx, chat, {
    author: partner,
    body: completed ? 'confirmed the trade, which is now completed' : 'confirmed the trade took place',
    kind: 'event',
  })
  notify(ctx, {
    actor: partner,
    body: completed ? 'Both of you confirmed, so your Binder is updated.' : 'Confirm it too once you have swapped the cards.',
    href: `/x/inbox/${chat.id}`,
    kind: 'trade',
    title: completed ? `Your trade with ${usernameOf(ctx.store, partner)} is completed` : `${usernameOf(ctx.store, partner)} confirmed your trade`,
  })
}
