import { createFileRoute } from '@tanstack/react-router'

import { WorkspacePlaceholder } from '#/components/layout/WorkspacePlaceholder'

export const Route = createFileRoute('/x/binder/')({
  head: () => ({ meta: [{ title: 'Binder | CardNearMe' }] }),
  component: BinderPage,
})

function BinderPage() {
  return (
    <WorkspacePlaceholder
      description="Manage your haves, wants and collection."
      features={[
        'Tabs: Haves, Wants, Collection with counts and market value',
        'List chips, new list, manage lists, share',
        'Search, sort, facet filters, add-card modal, item actions, multi-select',
      ]}
      title="Binder"
    />
  )
}
