import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Camera, CheckCircle2, MessagesSquare, PlusCircle, Scale } from 'lucide-react'

import { GameBadge } from '#/components/cards/CardBits'
import { Section } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { gamesQuery } from '#/services/queries'

export const Route = createFileRoute('/scanner')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(gamesQuery()),
  head: () => ({ meta: [{ title: 'Card scanner | CardNearMe' }] }),
  component: ScannerPage,
})

const steps = [
  {
    icon: Camera,
    text: 'Lay the card flat in good light and let the camera read it.',
    title: 'Point',
  },
  {
    icon: CheckCircle2,
    text: 'We suggest the Printing. Change it, or the finish, if the guess is off.',
    title: 'Confirm',
  },
  {
    icon: PlusCircle,
    text: 'Set the condition and quantity, then file it in your Collection or mark it as a Have.',
    title: 'Save',
  },
]

function ScannerPage() {
  const { data: games } = useSuspenseQuery(gamesQuery())
  return (
    <>
      <section className="hero-glow border-b">
        <div className="page-wrap space-y-6 py-16 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Skip the typing. Let the camera log your cards.</h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Snap a card with your phone and CardNearMe suggests which Printing it is, shows what it is worth and drops it into your Binder.
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
          description="Three taps per card, no catalogue browsing."
          title="How it works"
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
          description="Scanned cards feed straight into your Haves, so other Traders in your City can find them."
          title="Then trade them locally"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <MessagesSquare className="size-6 text-primary" />

              <p className="mt-3 font-bold">One chat per Trade</p>

              <p className="text-sm text-muted-foreground">Talk through the Trade with the other Trader and see every change to it as it happens.</p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <Scale className="size-6 text-primary" />

              <p className="mt-3 font-bold">Fair value at a glance</p>

              <p className="text-sm text-muted-foreground">Both sides of the Trade are priced from the same source, and cash can even out the difference.</p>
            </div>
          </div>
        </Section>
      </div>
    </>
  )
}
