import { createFileRoute, notFound } from '@tanstack/react-router'
import { useCallback } from 'react'

import { PageHeader } from '#/components/layout/PageHeader'
import { SignupPromo } from '#/components/trading/Promos'
import { TradeBrowser, buildTradeQuery } from '#/components/trading/TradeBrowser'
import { validateBrowseSearch } from '#/lib/browseSearch'
import type { BrowseSearch } from '#/lib/browseSearch'
import { cityQuery, tradeItemsQuery } from '#/services/queries'

export const Route = createFileRoute('/city/$city/haves')({
  validateSearch: validateBrowseSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps, params }) => {
    const city = await queryClient.ensureQueryData(cityQuery(params.city))
    if (!city) throw notFound()
    await queryClient.ensureQueryData(tradeItemsQuery(buildTradeQuery({ citySlug: city.slug }, 'haves', deps)))
    return city
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `Haves in ${loaderData.name} | CardNearMe` : 'CardNearMe' }] }),
  component: CityListPage,
})

function CityListPage() {
  const city = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
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
        }, { label: 'Haves' }]}
        description={`Browse all cards available for trade in ${label}`}
        title={`Haves in ${label}`}
      />

      <TradeBrowser
        aside={<SignupPromo description="Cards players near you are trading right now. Tell us what you are after and we will match you." />}
        onChange={onChange}
        query={buildTradeQuery({ citySlug: city.slug }, 'haves', search)}
        search={search}
      />
    </div>
  )
}
