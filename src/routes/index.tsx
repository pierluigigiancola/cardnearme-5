import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Bell, Camera, Coins, MapPin, Search, Store, Users } from 'lucide-react'

import { SignedOut } from '#/auth/AuthGate'
import { GameBadge } from '#/components/cards/CardBits'
import { DeckTile } from '#/components/decks/DeckTools'
import { Section } from '#/components/layout/PageHeader'
import { HeadStartSteps, ShareButton, UnlockProgress } from '#/components/trading/Promos'
import { Button } from '#/components/ui/button'
import { formatDate, formatNumber } from '#/lib/format'
import {
  cityTradeStatsQuery,
  decksQuery,
  detectedCityQuery,
  faqQuery,
  gamesQuery,
  newsQuery,
  storesQuery,
} from '#/services/queries'

export const Route = createFileRoute('/')({
  loader: async ({ context: { queryClient } }) => {
    const city = await queryClient.ensureQueryData(detectedCityQuery())
    await Promise.all([
      queryClient.ensureQueryData(gamesQuery()),
      queryClient.ensureQueryData(storesQuery(city.slug)),
      queryClient.ensureQueryData(cityTradeStatsQuery(city.slug)),
      queryClient.ensureQueryData(decksQuery({ limit: 4 })),
      queryClient.ensureQueryData(newsQuery()),
      queryClient.ensureQueryData(faqQuery()),
    ])
  },
  component: Home,
})

const steps = [
  {
    text: 'Choose the local game stores where you play and trade.',
    title: 'Pick your stores',
  },
  {
    text: 'Import, scan or build want lists. Say what you have and what you want.',
    title: 'List your cards',
  },
  {
    text: 'We match you with nearby players and alert you when new cards appear.',
    title: 'Get matched',
  },
  {
    text: 'Meet at game night, check the cards, walk away with what you wanted.',
    title: 'Swap in person',
  },
]

const benefits = [
  {
    icon: Search,
    text: 'Filter by game, set, condition and price. Know what is available before you walk into the store.',
    title: 'Find any card in seconds',
  },
  {
    icon: Bell,
    text: 'Build your want list once. Get pinged the moment someone at your stores lists the card you need.',
    title: 'Matches and alerts',
  },
  {
    icon: Coins,
    text: 'Why pay shipping on a card that is already in a binder across the table? Trade face to face.',
    title: 'Zero shipping, zero fees',
  },
  {
    icon: Users,
    text: 'See every card available across every store in your city and meet traders beyond your usual group.',
    title: 'Your city\'s trading network',
  },
]

function Home() {
  const { data: city } = useSuspenseQuery(detectedCityQuery())
  const { data: games } = useSuspenseQuery(gamesQuery())
  const { data: stores } = useSuspenseQuery(storesQuery(city.slug))
  const { data: stats } = useSuspenseQuery(cityTradeStatsQuery(city.slug))
  const { data: decks } = useSuspenseQuery(decksQuery({ limit: 4 }))
  const { data: news } = useSuspenseQuery(newsQuery())
  const { data: faq } = useSuspenseQuery(faqQuery())
  const unlocked = city.traderCount >= city.unlockThreshold

  return (
    <>
      <section className="hero-glow border-b">
        <div className="page-wrap grid gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              The card you need is
              {' '}

              <span className="text-primary">already in your city.</span>
            </h1>

            <p className="max-w-xl text-lg text-muted-foreground">
              Find the cards you want from traders at game stores near you. No shipping, no marketplace fees.
            </p>

            <div className="flex flex-wrap gap-2">
              {games.map(game => (
                <GameBadge
                  game={game}
                  key={game.id}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
              >
                <Link
                  params={{ city: city.slug }}
                  to="/city/$city"
                >
                  <MapPin />
                  Cards around

                  {' '}

                  {city.name}
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
              >
                <Link to="/stores">
                  <Store />
                  Find a store
                </Link>
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card/80 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Cards available around</p>

                <p className="text-xl font-bold">
                  {city.name}
                  ,

                  {' '}

                  {city.country}
                </p>
              </div>

              <Button
                asChild
                size="sm"
                variant="ghost"
              >
                <Link to="/city">Change city</Link>
              </Button>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Nearby game stores</p>

              <div className="flex flex-wrap gap-2">
                {stores.slice(0, 5).map(store => (
                  <Link
                    className="rounded-full border px-3 py-1 text-sm hover:border-primary"
                    key={store.slug}
                    params={{ store: store.slug }}
                    to="/stores/$store"
                  >
                    {store.name}
                  </Link>
                ))}

                {stores.length > 5 && (
                  <Link
                    className="rounded-full px-3 py-1 text-sm text-primary"
                    search={{ city: city.slug }}
                    to="/stores"
                  >
                    +
                    {stores.length - 5}

                    {' '}
                    more
                  </Link>
                )}
              </div>
            </div>

            {unlocked
              ? (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    className="rounded-xl border p-4 hover:border-have"
                    params={{ city: city.slug }}
                    to="/city/$city/haves"
                  >
                    <p className="text-2xl font-extrabold text-have">{formatNumber(stats.haves)}</p>

                    <p className="text-sm text-muted-foreground">cards for trade</p>
                  </Link>

                  <Link
                    className="rounded-xl border p-4 hover:border-want"
                    params={{ city: city.slug }}
                    to="/city/$city/wants"
                  >
                    <p className="text-2xl font-extrabold text-want">{formatNumber(stats.wants)}</p>

                    <p className="text-sm text-muted-foreground">cards wanted</p>
                  </Link>
                </div>
              )
              : <UnlockProgress city={city} />}

            <HeadStartSteps />

            <div className="flex gap-2">
              <ShareButton />

              <Button
                asChild
                variant="ghost"
              >
                <Link
                  params={{ city: city.slug }}
                  to="/city/$city"
                >
                  View trading page
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="page-wrap">
        <section className="my-10 grid items-center gap-6 rounded-2xl border bg-card p-6 md:grid-cols-[1fr_auto] md:p-10">
          <div className="space-y-3">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">Mobile scanner</p>

            <h2 className="text-3xl font-extrabold">Scan the binder. Keep moving.</h2>

            <p className="max-w-2xl text-muted-foreground">
              Photograph a card, confirm the Printing we suggest and save it to your Collection or as a Have, priced as you go.
            </p>
          </div>

          <Button
            asChild
            size="lg"
          >
            <Link to="/scanner">
              <Camera />
              See the scanner
            </Link>
          </Button>
        </section>

        <Section
          description="List what you have and what you want. We handle the rest."
          title="From want list to game night trade"
        >
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li
                className="rounded-xl border bg-card p-5"
                key={step.title}
              >
                <p className="text-3xl font-extrabold text-primary/60">{String(index + 1).padStart(2, '0')}</p>

                <p className="mt-2 font-bold">{step.title}</p>

                <p className="text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          action={(
            <Button
              asChild
              variant="ghost"
            >
              <Link to="/decks">
                All decks
                <ArrowRight />
              </Link>
            </Button>
          )}
          description="Builds from players in the community"
          title="Community deck lists"
        >
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {decks.map(deck => (
              <DeckTile
                deck={deck}
                key={deck.id}
              />
            ))}
          </div>
        </Section>

        <Section
          description="Prices, trends and insights"
          title="Market news"
        >
          <ul className="grid gap-3 md:grid-cols-2">
            {news.slice(0, 6).map(item => (
              <li key={item.id}>
                <a
                  className="block h-full rounded-xl border bg-card p-4 transition hover:border-primary/60"
                  href={item.url}
                >
                  <p className="text-xs text-muted-foreground">
                    {item.author}

                    {' · '}

                    {formatDate(item.publishedAt)}
                  </p>

                  <p className="font-semibold">{item.title}</p>

                  <p className="text-sm text-muted-foreground">{item.summary}</p>
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          description="No shipping delays, no marketplace fees, no middlemen."
          title="Why local trading wins"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(benefit => (
              <div
                className="rounded-xl border bg-card p-5"
                key={benefit.title}
              >
                <benefit.icon className="size-6 text-primary" />

                <p className="mt-3 font-bold">{benefit.title}</p>

                <p className="text-sm text-muted-foreground">{benefit.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          action={(
            <Button
              asChild
              variant="ghost"
            >
              <Link
                params={{ topic: 'faq' }}
                to="/help/$topic"
              >
                More answers
                <ArrowRight />
              </Link>
            </Button>
          )}
          title="Before your first trade"
        >
          <div className="divide-y rounded-xl border bg-card">
            {faq.map(entry => (
              <details
                className="group p-4"
                key={entry.question}
              >
                <summary className="cursor-pointer list-none font-semibold">{entry.question}</summary>

                <p className="mt-2 text-sm text-muted-foreground">{entry.answer}</p>
              </details>
            ))}
          </div>
        </Section>

        <SignedOut>
          <section className="my-10 rounded-2xl border bg-primary/10 p-10 text-center">
            <h2 className="text-3xl font-extrabold">Your next trade is already waiting</h2>

            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Sign up, list what you want, and get connected with local traders who have it.</p>

            <Button
              asChild
              className="mt-6"
              size="lg"
            >
              <Link to="/sign-up">Start trading</Link>
            </Button>
          </section>
        </SignedOut>
      </div>
    </>
  )
}
