import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Package } from 'lucide-react'

import { Price } from '#/components/cards/CardBits'
import { PageHeader } from '#/components/layout/PageHeader'
import { gameQuery, sealedQuery, setQuery } from '#/services/queries'
import type { SealedProduct } from '#/services/types'

export const Route = createFileRoute('/sets/$game/$set/sealed')({
  loader: async ({ context: { queryClient }, params }) => {
    const game = await queryClient.ensureQueryData(gameQuery(params.game))
    if (!game) throw notFound()
    const set = await queryClient.ensureQueryData(setQuery(game.id, params.set))
    if (!set) throw notFound()
    await queryClient.ensureQueryData(sealedQuery(game.id, set.code))
    return {
      game,
      set,
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.set.name} sealed products | CardNearMe` : 'Sealed | CardNearMe' }] }),
  component: SealedPage,
})

function SealedPage() {
  const { game, set } = Route.useLoaderData()
  const { data: products } = useSuspenseQuery(sealedQuery(game.id, set.code))
  const groups = new Map<string, SealedProduct[]>()
  for (const product of products) {
    groups.set(product.category, [...(groups.get(product.category) ?? []), product])
  }

  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[
          {
            href: '/sets',
            label: 'Sets',
          },
          {
            href: `/sets/${game.id}`,
            label: game.name,
          },
          {
            href: `/sets/${game.id}/${set.code}`,
            label: set.name,
          },
          { label: 'Sealed products' },
        ]}
        description={`${products.length} sealed products available`}
        title={`${set.name} sealed products`}
      />

      {products.length === 0 && <p className="text-muted-foreground">No sealed products for this set.</p>}

      <div className="space-y-8">
        {[...groups.entries()].map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-3 text-lg font-bold">
              {category}

              {' '}

              <span className="text-muted-foreground">
                (
                {items.length}
                )
              </span>
            </h2>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(product => (
                <li
                  className="flex items-center gap-3 rounded-xl border bg-card p-4"
                  key={product.id}
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Package className="size-6" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{product.name}</p>

                    <p className="text-xs text-muted-foreground">{product.variant}</p>
                  </div>

                  {product.price !== null && <Price amount={product.price} />}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
