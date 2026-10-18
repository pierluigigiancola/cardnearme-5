import { Link } from '@tanstack/react-router'
import { ArrowLeftRight, Camera, Layers, Lock, Share2, Swords } from 'lucide-react'
import { toast } from 'sonner'

import { AuthLinks, SignedOut } from '#/auth/AuthGate'
import { Button } from '#/components/ui/button'
import { Progress } from '#/components/ui/progress'
import type { City } from '#/services/types'

const promoPoints = [
  {
    icon: ArrowLeftRight,
    text: 'We pair your wants with binders at stores you both visit.',
    title: 'Match trades',
  },
  {
    icon: Camera,
    text: 'Point your phone at a stack and list it in seconds.',
    title: 'Scan your binder',
  },
  {
    icon: Layers,
    text: 'Know what you own and what it is worth.',
    title: 'Track your collection',
  },
  {
    icon: Swords,
    text: 'Brew, then trade for the pieces you are missing.',
    title: 'Build decks',
  },
]

/** Side panel shown to anonymous visitors on browse pages. */
export function SignupPromo({ description }: { description: string }) {
  return (
    <SignedOut>
      <div className="space-y-4 rounded-xl border bg-primary/5 p-4">
        <p className="text-xs font-bold tracking-widest text-primary uppercase">Trade locally</p>

        <div>
          <p className="text-lg font-bold">Want any of these?</p>

          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <ul className="space-y-3">
          {promoPoints.map(point => (
            <li
              className="flex gap-3"
              key={point.title}
            >
              <point.icon className="mt-0.5 size-4 shrink-0 text-primary" />

              <div>
                <p className="text-sm font-semibold">{point.title}</p>

                <p className="text-xs text-muted-foreground">{point.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <AuthLinks size="sm" />
      </div>
    </SignedOut>
  )
}

export function ShareButton({ label = 'Share link' }: { label?: string }) {
  return (
    <Button
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied')
      }}
      variant="outline"
    >
      <Share2 />

      {label}
    </Button>
  )
}

export function UnlockProgress({ city }: { city: City }) {
  const remaining = Math.max(0, city.unlockThreshold - city.traderCount)
  const percent = Math.min(100, Math.round((city.traderCount / city.unlockThreshold) * 100))

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-have">
        <Lock className="size-4" />
        Trading locked
      </div>

      <div>
        <p className="text-xl font-bold">
          {city.name}

          {' '}
          needs

          {' '}

          {remaining}

          {' '}
          more

          {' '}

          {remaining === 1 ? 'trader' : 'traders'}
        </p>

        <p className="text-sm text-muted-foreground">
          Trading unlocks when
          {' '}

          {city.name}

          {' '}
          reaches

          {' '}

          {city.unlockThreshold}

          {' '}
          traders. Invite the people you play with.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span>
            {city.traderCount}

            {' of '}

            {city.unlockThreshold}

            {' traders'}
          </span>

          <span>
            {percent}
            %
          </span>
        </div>

        <Progress value={percent} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/sign-up">Get started</Link>
        </Button>

        <ShareButton />
      </div>
    </div>
  )
}

export function HeadStartSteps() {
  const steps = [
    {
      description: 'Pick a local game store to start trading.',
      title: 'Join a store nearby',
      to: '/stores' as const,
    },
    {
      description: 'Add haves and wants so you are ready on day one.',
      title: 'List your cards',
      to: '/x/lists' as const,
    },
    {
      description: 'Import from any platform via CSV.',
      title: 'Import your collection',
      to: '/x/binder/import' as const,
    },
    {
      description: 'Brew decks so you know exactly what to trade for.',
      title: 'Build a deck',
      to: '/x/decks' as const,
    },
  ]
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {steps.map(step => (
        <li key={step.title}>
          <Link
            className="block h-full rounded-xl border bg-card p-4 transition hover:border-primary/60"
            to={step.to}
          >
            <p className="font-semibold">{step.title}</p>

            <p className="text-sm text-muted-foreground">{step.description}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
