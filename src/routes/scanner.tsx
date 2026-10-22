import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Camera, CheckCircle2, MessagesSquare, PlusCircle, Scale } from 'lucide-react'

import { GameBadge } from '#/components/cards/CardBits'
import { Section } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { gamesQuery } from '#/services/queries'

export const Route = createFileRoute('/scanner')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(gamesQuery()),
  head: () => ({ meta: [{ title: 'TCG card scanner | CardNearMe' }] }),
  component: ScannerPage,
})

const steps = [
  {
    icon: Camera,
    text: 'Hold the card in view. The sleeve can stay on.',
    title: 'Scan a card',
  },
  {
    icon: CheckCircle2,
    text: 'See the exact printing, language and finish. Fix any detail before saving.',
    title: 'Check the match',
  },
  {
    icon: PlusCircle,
    text: 'Pick the condition, then send it to your collection or a trade list.',
    title: 'Add it',
  },
]

function ScannerPage() {
  const { data: games } = useSuspenseQuery(gamesQuery())
  return (
    <>
      <section className="hero-glow border-b">
        <div className="page-wrap space-y-6 py-16 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Identify the exact card in front of you.</h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Point your phone at a card. We identify the printing, language and finish, show the market price and let you add it to your collection or a trade list.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {games.filter(game => game.capabilities.scanner).map(game => (
              <GameBadge
                game={game}
                key={game.id}
              />
            ))}
          </div>

          <Button
            disabled
            size="lg"
          >
            Mobile app coming soon
          </Button>
        </div>
      </section>

      <div className="page-wrap">
        <Section
          description="Get the exact details without scrolling search results or guessing the finish."
          title="From camera to collection"
        >
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                className="rounded-xl border bg-card p-5"
                key={step.title}
              >
                <step.icon className="size-6 text-primary" />

                <p className="mt-3 font-bold">
                  {String(index + 1).padStart(2, '0')}

                  {' '}

                  {step.title}
                </p>

                <p className="text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          description="Build the trade, compare every card, balance with cash, choose the meetup and accept."
          title="Built for real trades"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <MessagesSquare className="size-6 text-primary" />

              <p className="mt-3 font-bold">Everyone stays updated</p>

              <p className="text-sm text-muted-foreground">Card changes and trade decisions show up automatically; chat is there when you need it.</p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <Scale className="size-6 text-primary" />

              <p className="mt-3 font-bold">The whole trade, together</p>

              <p className="text-sm text-muted-foreground">Cards, cash, meetup details and acceptance live in the trade instead of getting lost in messages.</p>
            </div>
          </div>
        </Section>
      </div>
    </>
  )
}
