import { createFileRoute } from '@tanstack/react-router'

import { WorkspacePlaceholder } from '#/components/layout/WorkspacePlaceholder'

export const Route = createFileRoute('/x/lists')({
  head: () => ({ meta: [{ title: 'Lists | CardNearMe' }] }),
  component: ListsPage,
})

function ListsPage() {
  return (
    <WorkspacePlaceholder
      description="Manage your haves and wants lists."
      features={[
        'Table: list, type, game, cards, visibility, updated',
        'Create, rename, change visibility, delete',
      ]}
      title="Lists"
    />
  )
}
