import { createFileRoute } from '@tanstack/react-router'

import { WorkspacePlaceholder } from '#/components/layout/WorkspacePlaceholder'

export const Route = createFileRoute('/x/binder/import')({
  head: () => ({ meta: [{ title: 'Import cards | CardNearMe' }] }),
  component: ImportCardsPage,
})

function ImportCardsPage() {
  return (
    <WorkspacePlaceholder
      description="Import your collection from a CSV export or a pasted list."
      features={[
        'Upload CSV or paste list',
        'Map columns, preview matches, fix unmatched rows',
        'Confirm import into collection, haves or wants',
      ]}
      title="Import cards"
    />
  )
}
