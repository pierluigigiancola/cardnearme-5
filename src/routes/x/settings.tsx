import { createFileRoute } from '@tanstack/react-router'

import { WorkspacePlaceholder } from '#/components/layout/WorkspacePlaceholder'

export const Route = createFileRoute('/x/settings')({
  head: () => ({ meta: [{ title: 'Settings | CardNearMe' }] }),
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <WorkspacePlaceholder
      description="Profile, games, stores and pricing."
      features={[
        'Profile and avatar',
        'Games you play',
        'Pricing source: Cardmarket (EUR) or TCGplayer (USD)',
      ]}
      title="Settings"
    />
  )
}
