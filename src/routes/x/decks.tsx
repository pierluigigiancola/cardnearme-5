import { createFileRoute } from '@tanstack/react-router'

import { WorkspacePlaceholder } from '#/components/layout/WorkspacePlaceholder'

export const Route = createFileRoute('/x/decks')({
  head: () => ({ meta: [{ title: 'Your decks | CardNearMe' }] }),
  component: YourDecksPage,
})

function YourDecksPage() {
  return (
    <WorkspacePlaceholder
      description="Build, manage and organise your decks."
      features={[
        'Empty state with create deck',
        'Deck builder: add cards, sections, format validation, owned counts',
        'Import / export text lists',
      ]}
      title="Your decks"
    />
  )
}
