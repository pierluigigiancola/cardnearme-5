import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'

import { GatedPanel, SignedIn, SignedOut } from '#/auth/AuthGate'
import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { cityQuery } from '#/services/queries'

export const Route = createFileRoute('/city/$city/matched')({
  loader: async ({ context: { queryClient }, params }) => {
    const city = await queryClient.ensureQueryData(cityQuery(params.city))
    if (!city) throw notFound()
    return city
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `Matched trades in ${loaderData.name} | CardNearMe` : 'CardNearMe' }] }),
  component: MatchedPage,
})

function MatchedPage() {
  const city = Route.useLoaderData()
  const label = `${city.name}, ${city.country}`

  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{
          href: '/city',
          label: 'City',
        }, {
          href: `/city/${city.slug}`,
          label,
        }, { label: 'Matched trades' }]}
        description={`Cards that match between your lists and players in ${label}`}
        title={`Matched trades in ${label}`}
      />

      <SignedOut>
        <GatedPanel
          action="matches"
          className="mx-auto max-w-lg"
          title="Sign in to see your matches"
        />
      </SignedOut>

      <SignedIn>
        {/* Ticket 02: replace with the viewer's matches from the matching service. */}
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <Sparkles className="size-6 text-match" />

          <p className="font-semibold">No matched cards yet</p>

          <p className="text-sm text-muted-foreground">Add cards to your wants list and we will notify you when players in this city have them for trade.</p>

          <Button
            asChild
            variant="outline"
          >
            <Link
              search={{ city: city.slug }}
              to="/stores"
            >
              Browse stores nearby
            </Link>
          </Button>
        </div>
      </SignedIn>
    </div>
  )
}
