import type { NotificationsService } from '../../services'
import type { NotificationKind } from '../../types'
import { compare } from '../queryHelpers'

import { now } from './context'
import type { TraderContext } from './context'
import { myChats, runPartners, summarise } from './conversations'

export function notificationsService(ctx: TraderContext): NotificationsService {
  const { trader } = ctx
  return {
    getUnreadCounts: async () => {
      runPartners(ctx)
      return {
        messages: myChats(ctx).reduce((total, chat) => total + summarise(ctx, chat).unread, 0),
        notifications: trader.notifications.filter(notification => !notification.readAt).length,
      }
    },
    list: async ({ kind, status } = {}) => {
      runPartners(ctx)
      const byKind: Record<NotificationKind, number> = {
        'item-available': 0,
        'item-wanted': 0,
        'message': 0,
        'trade': 0,
      }
      for (const notification of trader.notifications) byKind[notification.kind]++
      return {
        counts: {
          byKind,
          total: trader.notifications.length,
          unread: trader.notifications.filter(notification => !notification.readAt).length,
        },
        items: trader.notifications
          .filter(notification =>
            (!kind || notification.kind === kind)
            && (!status || (status === 'unread' ? !notification.readAt : Boolean(notification.readAt))))
          .sort((a, b) => compare(a.createdAt, b.createdAt, 'desc')),
      }
    },
    markAllRead: async () => {
      for (const notification of trader.notifications) notification.readAt ??= now()
    },
    markRead: async (notificationIds) => {
      const ids = new Set(notificationIds)
      for (const notification of trader.notifications) {
        if (ids.has(notification.id)) notification.readAt ??= now()
      }
    },
  }
}
