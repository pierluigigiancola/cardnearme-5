import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Lock, MapPin, Users } from 'lucide-react'

import { PageHeader } from '#/components/layout/PageHeader'
import { formatNumber } from '#/lib/format'
import { citiesQuery } from '#/services/queries'

export const Route = createFileRoute('/city/')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(citiesQuery()),
  head: () => ({ meta: [{ title: 'Trading cities | CardNearMe' }] }),
  component: CityIndex,
})

function CityIndex() {
  const { data: cities } = useSuspenseQuery(citiesQuery())
  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{ label: 'Cities' }]}
        description="Every city where players trade. Trading unlocks once enough traders join."
        title="Trading cities"
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cities.map((city) => {
          const unlocked = city.traderCount >= city.unlockThreshold
          return (
            <li key={city.slug}>
              <Link
                className="flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/60"
                params={{ city: city.slug }}
                to="/city/$city"
              >
                <MapPin className="size-5 text-primary" />

                <div className="flex-1">
                  <p className="font-semibold">
                    {city.name}
                    ,

                    {' '}

                    {city.country}
                  </p>

                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" />

                    {formatNumber(city.traderCount)}

                    {' traders'}
                  </p>
                </div>

                {!unlocked && <Lock className="size-4 text-have" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
