import { createFileRoute } from '@tanstack/react-router'

import { WorkspacePlaceholder } from '#/components/layout/WorkspacePlaceholder'

export const Route = createFileRoute('/x/inbox')({
  head: () => ({ meta: [{ title: 'Inbox | CardNearMe' }] }),
  component: InboxPage,
})

function InboxPage() {
  return (
    <WorkspacePlaceholder
      description="Conversations with other traders."
      features={[
        'Chat list with trade status and presence',
        'Conversation with composer, View trade and Matches',
        'Trade card: you give / you get, cash balance, meetup, status',
      ]}
      title="Inbox"
    />
  )
}
