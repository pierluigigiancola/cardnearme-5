import { createFileRoute } from '@tanstack/react-router'

import { WorkspacePlaceholder } from '#/components/layout/WorkspacePlaceholder'

export const Route = createFileRoute('/x/stores')({
  head: () => ({ meta: [{ title: 'Your stores | CardNearMe' }] }),
  component: YourStoresPage,
})

function YourStoresPage() {
  return (
    <WorkspacePlaceholder
      description="Stores where you trade."
      features={[
        'Tabs per joined store with store settings',
        'Matches, haves and wants at each store',
        'Invite traders',
      ]}
      title="Your stores"
    />
  )
}
