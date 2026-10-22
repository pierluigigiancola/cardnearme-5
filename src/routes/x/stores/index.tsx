import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { Store } from 'lucide-react'

import { viewerLimits } from '#/auth/limits'
import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { profileQuery } from '#/services/queries'

export const Route = createFileRoute('/x/stores/')({
  loader: async ({ context: { queryClient, user } }) => {
    const profile = await queryClient.ensureQueryData(profileQuery(user.id))
    const first = profile.storeSlugs.at(0)
    if (first) {
      throw redirect({
        params: { store: first },
        replace: true,
        to: '/x/stores/$store',
      })
    }
  },
  head: () => ({ meta: [{ title: 'Your stores | CardNearMe' }] }),
  component: NoStoresPage,
})

function NoStoresPage() {
  return (
    <div className="page-wrap pb-12">
      <PageHeader
        description="Stores where you trade."
        title="Your stores"
      />

      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
        <Store className="size-8 text-primary" />

        <p className="text-lg font-semibold">You have not joined a store yet</p>

        <p className="text-sm text-muted-foreground">{`Join up to ${viewerLimits.tradingStores} stores where you play. Matches and trade proposals use them as meetup spots.`}</p>

        <Button asChild>
          <Link to="/stores">Find stores near you</Link>
        </Button>
      </div>
    </div>
  )
}
