import { createFileRoute } from '@tanstack/react-router'

import { WorkspacePlaceholder } from '#/components/layout/WorkspacePlaceholder'

export const Route = createFileRoute('/x/notifications')({
  head: () => ({ meta: [{ title: 'Notifications | CardNearMe' }] }),
  component: NotificationsPage,
})

function NotificationsPage() {
  return (
    <WorkspacePlaceholder
      description="Messages and trade alerts."
      features={[
        'Counters: messages, trades, items available, items wanted',
        'Filter by type and read status',
      ]}
      title="Notifications"
    />
  )
}
