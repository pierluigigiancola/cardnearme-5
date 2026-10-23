import type { ChatService } from '../../services'
import { compare } from '../queryHelpers'

import { now } from './context'
import type { TraderContext } from './context'
import { chatWith, findChat, myChats, post, requireChat, runPartners, summarise } from './conversations'

export function chatService(ctx: TraderContext): ChatService {
  return {
    getThread: async (chatId) => {
      runPartners(ctx)
      const chat = findChat(ctx, chatId)
      if (!chat) return null
      const tradeIds = new Set(chat.messages.flatMap(message => (message.kind === 'trade' ? [message.tradeId] : [])))
      return {
        chat: summarise(ctx, chat),
        messages: chat.messages,
        trades: Object.fromEntries(ctx.store.trades.filter(trade => tradeIds.has(trade.id)).map(trade => [trade.id, trade])),
      }
    },
    listChats: async () => {
      runPartners(ctx)
      return myChats(ctx)
        .map(chat => summarise(ctx, chat))
        .sort((a, b) => compare(a.updatedAt, b.updatedAt, 'desc'))
    },
    markRead: async (chatId) => {
      const chat = requireChat(ctx, chatId)
      chat.lastReadAt[ctx.me] = now()
      for (const notification of ctx.trader.notifications) {
        if (!notification.readAt && notification.href === `/x/inbox/${chatId}`) notification.readAt = now()
      }
    },
    openChat: async partner => summarise(ctx, chatWith(ctx, partner)),
    sendMessage: async (chatId, body) => {
      const text = body.trim().slice(0, 2000)
      if (!text) throw new Error('Write a message first')
      post(ctx, requireChat(ctx, chatId), {
        author: ctx.me,
        body: text,
        kind: 'text',
      })
    },
  }
}
