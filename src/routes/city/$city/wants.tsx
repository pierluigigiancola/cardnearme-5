import { createFileRoute, notFound } from '@tanstack/react-router'
import { useCallback } from 'react'

import { tradeResultLimit } from '#/auth/limits'
import { useViewer } from '#/auth/useViewer'
import { PageHeader } from '#/components/layout/PageHeader'
import { SignupPromo } from '#/components/trading/Promos'
import { TradeBrowser, buildTradeQuery } from '#/components/trading/TradeBrowser'
import { validateBrowseSearch } from '#/lib/browseSearch'
import type { BrowseSearch } from '#/lib/browseSearch'
import { cityQuery, tradeItemsQuery } from '#/services/queries'

export const Route = createFileRoute('/city/$city/wants')({
  validateSearch: validateBrowseSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient, viewer }, deps, params }) => {
    const city = await queryClient.ensureQueryData(cityQuery(params.city))
    if (!city) throw notFound()
    await queryClient.ensureQueryData(tradeItemsQuery(buildTradeQuery({ citySlug: city.slug }, 'wants', deps, tradeResultLimit(viewer))))
    return city
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `Wanted cards in ${loaderData.name} | CardNearMe` : 'CardNearMe' }] }),
  component: CityListPage,
})

function CityListPage() {
  const city = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const viewer = useViewer()
  const onChange = useCallback(
    (update: (previous: BrowseSearch) => BrowseSearch) => void navigate({
      replace: true,
      search: update,
    }),
    [navigate],
  )
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
        }, { label: 'Wants' }]}
        description={`Browse all cards players are looking for in ${label}`}
        title={`Wanted cards in ${label}`}
      />

      <TradeBrowser
        aside={<SignupPromo description="Cards players near you are looking for. List the ones you have and we will match you." />}
        onChange={onChange}
        query={buildTradeQuery({ citySlug: city.slug }, 'wants', search, tradeResultLimit(viewer))}
        search={search}
      />
    </div>
  )
}
