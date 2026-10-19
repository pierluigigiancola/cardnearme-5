import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeftRight, Bell, CheckCheck, MessageSquare, PackageCheck, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { formatRelative } from '#/lib/format'
import { cn } from '#/lib/utils'
import { useWorkspaceMutation } from '#/services/mutations'
import { notificationsQuery } from '#/services/queries'
import type { AppNotification, NotificationKind, NotificationQuery } from '#/services/types'

const kinds: {
  id: NotificationKind;
  label: string;
  icon: LucideIcon;
  tone: string
}[] = [
  {
    icon: MessageSquare,
    id: 'message',
    label: 'Messages',
    tone: 'text-primary bg-primary/15',
  },
  {
    icon: ArrowLeftRight,
    id: 'trade',
    label: 'Trades',
    tone: 'text-match bg-match/15',
  },
  {
    icon: PackageCheck,
    id: 'item-available',
    label: 'Items available',
    tone: 'text-want bg-want/15',
  },
  {
    icon: Search,
    id: 'item-wanted',
    label: 'Items wanted',
    tone: 'text-have bg-have/15',
  },
]

function isKind(value: unknown): value is NotificationKind {
  return kinds.some(kind => kind.id === value)
}

export const Route = createFileRoute('/x/notifications')({
  validateSearch: (search: Record<string, unknown>): NotificationQuery => ({
    kind: isKind(search.kind) ? search.kind : undefined,
    status: search.status === 'unread' || search.status === 'read' ? search.status : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient, user }, deps }) => {
    await queryClient.ensureQueryData(notificationsQuery(user.id, deps))
  },
  head: () => ({ meta: [{ title: 'Notifications | CardNearMe' }] }),
  component: NotificationsPage,
})

function NotificationsPage() {
  const { user } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const { data } = useSuspenseQuery(notificationsQuery(user.id, search))
  const markRead = useWorkspaceMutation((services, ids: string[]) => services.notifications.markRead(ids))
  const markAllRead = useWorkspaceMutation(services => services.notifications.markAllRead())

  const open = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate([notification.id])
    void router.navigate({ href: notification.href })
  }
  const setFilter = (patch: NotificationQuery) => void navigate({
    replace: true,
    search: previous => ({
      ...previous,
      ...patch,
    }),
  })

  return (
    <div className="page-wrap pb-12">
      <PageHeader
        actions={(
          <Button
            disabled={data.counts.unread === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate(undefined)}
            variant="outline"
          >
            <CheckCheck />
            Mark all as read
          </Button>
        )}
        description="Messages, trade updates and cards that match your lists."
        title="Notifications"
      />

      <div className="grid gap-3 sm:grid-cols-5">
        <Counter
          active={!search.kind}
          icon={Bell}
          label="All"
          onClick={() => setFilter({ kind: undefined })}
          tone="text-foreground bg-muted"
          value={data.counts.total}
        />

        {kinds.map(kind => (
          <Counter
            active={search.kind === kind.id}
            icon={kind.icon}
            key={kind.id}
            label={kind.label}
            onClick={() => setFilter({ kind: kind.id })}
            tone={kind.tone}
            value={data.counts.byKind[kind.id]}
          />
        ))}
      </div>

      <div
        aria-label="Read status"
        className="mt-6 mb-3 inline-flex rounded-lg bg-muted p-1"
        role="tablist"
      >
        {([
          [undefined, 'All'],
          ['unread', `Unread (${data.counts.unread})`],
          ['read', 'Read'],
        ] as const).map(([status, label]) => (
          <button
            aria-selected={search.status === status}
            className={cn('rounded-md px-3 py-1 text-sm font-medium transition', search.status === status ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            key={label}
            onClick={() => setFilter({ status })}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="divide-y rounded-xl border bg-card">
        {data.items.map((notification) => {
          const kind = kinds.find(candidate => candidate.id === notification.kind) ?? kinds[0]
          return (
            <li key={notification.id}>
              <button
                className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent/60', !notification.readAt && 'bg-primary/5')}
                onClick={() => open(notification)}
                type="button"
              >
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', kind.tone)}>
                  <kind.icon className="size-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate', !notification.readAt && 'font-semibold')}>{notification.title}</span>

                  <span className="block truncate text-sm text-muted-foreground">{notification.body}</span>
                </span>

                <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(notification.createdAt)}</span>

                {!notification.readAt && (
                  <span
                    aria-label="Unread"
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                    role="img"
                  />
                )}
              </button>
            </li>
          )
        })}

        {data.items.length === 0 && <li className="p-10 text-center text-muted-foreground">Nothing here — you are all caught up.</li>}
      </ul>
    </div>
  )
}

function Counter({ active, icon: Icon, label, onClick, tone, value }: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  active: boolean;
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={cn('flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition hover:border-primary/60', active && 'border-primary ring-1 ring-primary')}
      onClick={onClick}
      type="button"
    >
      <span className={cn('flex size-9 items-center justify-center rounded-full', tone)}>
        <Icon className="size-4" />
      </span>

      <span>
        <span className="block text-xl font-bold tabular-nums">{value}</span>

        <span className="block text-xs text-muted-foreground">{label}</span>
      </span>
    </button>
  )
}
