import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ExternalLink, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { GatedPanel, SignedIn, SignedOut, useRequireAuth } from '#/auth/AuthGate'
import { CardArt } from '#/components/cards/CardArt'
import { Price, PriceChange, RarityLabel } from '#/components/cards/CardBits'
import { CardList } from '#/components/cards/CardList'
import { PageHeader, Section } from '#/components/layout/PageHeader'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { formatDate } from '#/lib/format'
import { cn } from '#/lib/utils'
import { cardAvailabilityQuery, cardQuery, gameQuery, printingsQuery } from '#/services/queries'
import type { Finish } from '#/services/types'

export const Route = createFileRoute('/sets/$game/$set/$card/$number')({
  loader: async ({ context: { queryClient }, params }) => {
    const game = await queryClient.ensureQueryData(gameQuery(params.game))
    if (!game) throw notFound()
    const card = await queryClient.ensureQueryData(cardQuery(game.id, params.set, params.number))
    if (!card) throw notFound()
    await Promise.all([
      queryClient.ensureQueryData(printingsQuery(card)),
      queryClient.ensureQueryData(cardAvailabilityQuery(card)),
    ])
    return {
      card,
      game,
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.card.name} — ${loaderData.card.setName} | CardNearMe` : 'Card | CardNearMe' }] }),
  component: CardPage,
})

const legalityStyle = {
  banned: 'bg-destructive/20 text-destructive-foreground',
  legal: 'bg-want/20 text-want',
  not_legal: 'bg-muted text-muted-foreground',
  restricted: 'bg-have/20 text-have',
}

function CardPage() {
  const { card, game } = Route.useLoaderData()
  const { data: printings } = useSuspenseQuery(printingsQuery(card))
  const { data: availability } = useSuspenseQuery(cardAvailabilityQuery(card))
  const requireAuth = useRequireAuth()
  const [finish, setFinish] = useState<Finish>('nonfoil')
  const price = card.prices[finish] ?? card.prices.nonfoil

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
            href: `/sets/${game.id}/${card.setCode}`,
            label: card.setName,
          },
          { label: card.name },
        ]}
        title={card.name}
      />

      <div className="grid gap-8 lg:grid-cols-[300px_1fr_1fr]">
        <div className="space-y-3">
          <CardArt
            card={card}
            finish={finish}
          />

          {card.finishes.length > 1 && (
            <ToggleGroup
              className="w-full"
              onValueChange={value => value && setFinish(card.finishes.find(option => option === value) ?? 'nonfoil')}
              type="single"
              value={finish}
              variant="outline"
            >
              {card.finishes.map(option => (
                <ToggleGroupItem
                  className="flex-1 capitalize"
                  key={option}
                  value={option}
                >
                  {option}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}

          <div className="flex gap-2">
            <Button
              asChild
              className="flex-1"
              variant="outline"
            >
              <a
                href="#"
                rel="noreferrer"
              >
                <ExternalLink />
                Buy

                {' '}

                <Price amount={price} />
              </a>
            </Button>

            <Button
              className="flex-1"
              onClick={() => requireAuth('addToCollection', () => toast.success(`${card.name} added to your collection`))}
            >
              <Plus />
              Add to…
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-primary">{card.typeLine}</p>

            <p className="mt-2 whitespace-pre-line">{card.text}</p>

            {card.flavorText && <p className="mt-2 text-sm text-muted-foreground italic">{card.flavorText}</p>}
          </div>

          <div className="flex items-center justify-between rounded-xl border bg-card p-4">
            <div>
              <p className="font-semibold">{card.setName}</p>

              <p className="text-xs text-muted-foreground uppercase">
                {card.setCode}

                {' #'}

                {card.number}

                {' · '}

                {card.artist}
              </p>
            </div>

            <div className="text-right">
              <Price
                amount={price}
                className="text-lg"
              />

              <div className="flex items-center justify-end gap-2 text-xs">
                <RarityLabel rarity={card.rarity} />

                <PriceChange value={card.priceChange7d} />
              </div>
            </div>
          </div>

          <SignedOut>
            <GatedPanel action="ownership" />
          </SignedOut>

          <SignedIn>
            <div className="grid grid-cols-3 gap-2 rounded-xl border bg-card p-4 text-center text-sm">
              {[['Collection', 0], ['Haves', 0], ['Wants', 0]].map(([label, count]) => (
                <div key={label}>
                  <p className="text-xl font-bold">{count}</p>

                  <p className="text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </SignedIn>
        </div>

        <div className="space-y-4">
          <SignedOut>
            <GatedPanel
              action="priceHistory"
              className="h-full"
              title="Unlock the price chart"
            />
          </SignedOut>

          <SignedIn>
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-2 text-sm font-semibold">Price history</p>

              {/* Ticket: connect a pricing history service; this is a placeholder sparkline. */}
              <svg
                aria-label="Price history"
                className="h-40 w-full text-primary"
                preserveAspectRatio="none"
                role="img"
                viewBox="0 0 100 40"
              >
                <polyline
                  fill="none"
                  points="0,30 10,28 20,31 30,24 40,26 50,20 60,22 70,15 80,18 90,12 100,14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </SignedIn>
        </div>
      </div>

      <Section
        description={`See where ${card.name} is available and wanted`}
        title="Card availability"
      >
        {availability.length === 0
          ? <p className="text-sm text-muted-foreground">Nobody is trading this card yet.</p>
          : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {availability.map(entry => (
                <li
                  className="space-y-2 rounded-xl border bg-card p-4"
                  key={entry.citySlug}
                >
                  <p className="flex items-center gap-1 font-semibold">
                    <MapPin className="size-4 text-primary" />

                    {entry.cityName}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {entry.country}

                    {' · '}

                    {entry.storeCount}

                    {' stores'}
                  </p>

                  <div className="flex gap-2 text-sm">
                    <Link
                      className="flex-1 rounded-lg bg-have/15 px-2 py-1 text-center text-have"
                      params={{ city: entry.citySlug }}
                      search={{ q: card.name }}
                      to="/city/$city/haves"
                    >
                      {entry.available}

                      {' available'}
                    </Link>

                    <Link
                      className="flex-1 rounded-lg bg-want/15 px-2 py-1 text-center text-want"
                      params={{ city: entry.citySlug }}
                      search={{ q: card.name }}
                      to="/city/$city/wants"
                    >
                      {entry.wanted}

                      {' wanted'}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Section>

      {printings.length > 0 && (
        <Section title={`Other printings (${printings.length})`}>
          <CardList
            cards={printings}
            view="visual"
          />
        </Section>
      )}

      {Object.keys(card.legalities).length > 0 && (
        <Section title="Legalities">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {Object.entries(card.legalities).map(([format, status]) => (
              <li
                className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                key={format}
              >
                <span className="capitalize">{format}</span>

                <Badge className={cn('text-[10px] uppercase', legalityStyle[status])}>{status.replace('_', ' ')}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {card.rulings.length > 0 && (
        <Section title="Rules & rulings">
          <ul className="space-y-3">
            {card.rulings.map(ruling => (
              <li
                className="rounded-lg border bg-card p-4 text-sm"
                key={ruling.date + ruling.text}
              >
                <p className="text-xs text-muted-foreground">{formatDate(ruling.date)}</p>

                <p>{ruling.text}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
