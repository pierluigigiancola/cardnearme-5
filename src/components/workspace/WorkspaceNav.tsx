import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Bell, BookOpen, Inbox, ListChecks, Settings, Store, Swords } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useSignedInViewer } from '#/auth/useViewer'
import type { RoutePath } from '#/components/layout/PageHeader'
import { unreadCountsQuery } from '#/services/queries'

const items: {
  label: string;
  to: RoutePath;
  icon: LucideIcon;
  badge?: 'messages' | 'notifications'
}[] = [
  {
    icon: BookOpen,
    label: 'Binder',
    to: '/x/binder',
  },
  {
    icon: ListChecks,
    label: 'Lists',
    to: '/x/lists',
  },
  {
    icon: Swords,
    label: 'Decks',
    to: '/x/decks',
  },
  {
    icon: Store,
    label: 'Stores',
    to: '/x/stores',
  },
  {
    badge: 'messages',
    icon: Inbox,
    label: 'Inbox',
    to: '/x/inbox',
  },
  {
    badge: 'notifications',
    icon: Bell,
    label: 'Notifications',
    to: '/x/notifications',
  },
  {
    icon: Settings,
    label: 'Settings',
    to: '/x/settings',
  },
]

/** Secondary navigation across the signed-in workspace. */
export function WorkspaceNav() {
  const viewer = useSignedInViewer()
  const { data: unread } = useQuery(unreadCountsQuery(viewer.id))

  return (
    <nav
      aria-label="Workspace"
      className="border-b bg-background/60"
    >
      <div className="page-wrap flex gap-1 overflow-x-auto py-1.5">
        {items.map((item) => {
          const count = item.badge ? unread?.[item.badge] ?? 0 : 0
          return (
            <Link
              activeProps={{ className: 'bg-accent text-foreground' }}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              key={item.to}
              to={item.to}
            >
              <item.icon className="size-4" />

              {item.label}

              {count > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tabular-nums">{count}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
