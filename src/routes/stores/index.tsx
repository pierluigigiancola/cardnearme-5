import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '#/components/layout/PageHeader'
import { StoreList, StoreMap } from '#/components/places/Places'
import { citiesQuery, cityQuery, detectedCityQuery, storesQuery } from '#/services/queries'

export const Route = createFileRoute('/stores/')({
  validateSearch: (search: Record<string, unknown>): { city?: string } => ({ city: typeof search.city === 'string' ? search.city : undefined }),
  loaderDeps: ({ search }) => ({ city: search.city }),
  loader: async ({ context: { queryClient }, deps }) => {
    const city = deps.city
      ? await queryClient.ensureQueryData(cityQuery(deps.city))
      : await queryClient.ensureQueryData(detectedCityQuery())
    await Promise.all([
      queryClient.ensureQueryData(citiesQuery()),
      city ? queryClient.ensureQueryData(storesQuery(city.slug)) : null,
    ])
    return city
  },
  head: () => ({ meta: [{ title: 'Find local game stores | CardNearMe' }] }),
  component: StoresPage,
})

function StoresPage() {
  const city = Route.useLoaderData()
  const { data: cities } = useSuspenseQuery(citiesQuery())
  const { data: stores } = useSuspenseQuery(storesQuery(city?.slug ?? ''))

  return (
    <div className="page-wrap">
      <PageHeader
        description="Find nearby game stores, see where people trade, and browse cards at each location."
        title="Find your trading spot"
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">In which city do you play?</span>

        {cities.map(option => (
          <Link
            activeOptions={{ includeSearch: true }}
            className="rounded-full border px-3 py-1 text-sm hover:border-primary data-[status=active]:border-primary data-[status=active]:bg-primary/15"
            key={option.slug}
            search={{ city: option.slug }}
            to="/stores"
          >
            {option.name}
          </Link>
        ))}
      </div>

      {city && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  {stores.length}

                  {' stores near'}
                </p>

                <p className="text-lg font-bold">
                  {city.name}
                  ,

                  {' '}

                  {city.country}
                </p>
              </div>

              <Link
                className="text-sm font-semibold text-primary"
                params={{ city: city.slug }}
                to="/city/$city"
              >
                City trading hub →
              </Link>
            </div>

            <StoreList stores={stores} />
          </div>

          <StoreMap
            className="min-h-96"
            stores={stores}
          />
        </div>
      )}
    </div>
  )
}
