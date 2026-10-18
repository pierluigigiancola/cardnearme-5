import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '#/components/layout/PageHeader'

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: 'Privacy policy | CardNearMe' }] }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <div className="page-wrap max-w-3xl">
      <PageHeader
        description="Placeholder — replace with your reviewed privacy policy before launch."
        title="Privacy policy"
      />

      <div className="prose dark:prose-invert">
        <h2>What we collect</h2>

        <p>Account details (email, username), the stores and city you choose, and the cards you list.</p>

        <h2>Why</h2>

        <p>To run your account, show your lists to nearby traders and match trades.</p>

        <h2>Your choices</h2>

        <p>You can hide your stores from your profile, make lists private, export or delete your data at any time.</p>
      </div>
    </div>
  )
}
