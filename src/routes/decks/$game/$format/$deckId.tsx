import { useSuspenseQuery } from '@tanstack/react-query'
import { ClientOnly, Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Copy, Download, Heart, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { GatedPanel, SignedIn, SignedOut, useRequireAuth } from '#/auth/AuthGate'
import { Price } from '#/components/cards/CardBits'
import { DrawOdds, HandSimulator, ManaCurve, TypeBreakdown, deckValue } from '#/components/decks/DeckTools'
import { PageHeader, Section } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { formatRelative } from '#/lib/format'
import { deckCommentsQuery, deckQuery, gameQuery } from '#/services/queries'
import type { DeckCard } from '#/services/types'

export const Route = createFileRoute('/decks/$game/$format/$deckId')({
  loader: async ({ context: { queryClient }, params }) => {
    const [game, deck] = await Promise.all([
      queryClient.ensureQueryData(gameQuery(params.game)),
      queryClient.ensureQueryData(deckQuery(params.deckId)),
    ])
    if (!game || !deck || deck.gameId !== game.id) throw notFound()
    await queryClient.ensureQueryData(deckCommentsQuery(deck.id))
    return {
      deck,
      game,
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.deck.name} — ${loaderData.deck.format} deck | CardNearMe` : 'Deck | CardNearMe' }] }),
  component: DeckPage,
})

const sectionLabels: Record<DeckCard['section'], string> = {
  commander: 'Commander',
  considering: 'Considering',
  mainboard: 'Mainboard',
  sideboard: 'Sideboard',
}

function deckToText(cards: DeckCard[]) {
  return (['commander', 'mainboard', 'sideboard'] as const)
    .map((section) => {
      const lines = cards.filter(entry => entry.section === section).map(entry => `${entry.quantity} ${entry.card.name}`)
      return lines.length ? `// ${sectionLabels[section]}\n${lines.join('\n')}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}

function DeckPage() {
  const { deck, game } = Route.useLoaderData()
  const { data: comments } = useSuspenseQuery(deckCommentsQuery(deck.id))
  const requireAuth = useRequireAuth()
  const [draft, setDraft] = useState('')
  const mainCount = deck.cards.filter(entry => entry.section !== 'sideboard').reduce((sum, entry) => sum + entry.quantity, 0)
  const sideCount = deck.cards.filter(entry => entry.section === 'sideboard').reduce((sum, entry) => sum + entry.quantity, 0)

  const groups = new Map<string, DeckCard[]>()
  for (const entry of deck.cards) {
    const key = entry.section === 'mainboard' ? (entry.card.typeLine.split(' — ')[0] ?? 'Other') : sectionLabels[entry.section]
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }

  return (
    <div className="page-wrap">
      <PageHeader
        actions={(
          <>
            <Button
              onClick={() => requireAuth('comment', () => toast.success('Liked'))}
              variant="outline"
            >
              <Heart />

              {deck.likes}
            </Button>

            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(deckToText(deck.cards))
                toast.success('Deck list copied')
              }}
              variant="outline"
            >
              <Download />
              Export
            </Button>

            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href)
                toast.success('Link copied')
              }}
              variant="outline"
            >
              <Copy />
              Copy link
            </Button>
          </>
        )}
        crumbs={[
          {
            href: '/decks',
            label: 'Community decks',
          },
          {
            href: `/decks/${game.id}`,
            label: game.name,
          },
          {
            href: `/decks/${game.id}/${deck.format.toLowerCase()}`,
            label: deck.format,
          },
          { label: deck.name },
        ]}
        description={(
          <>
            {deck.format}

            {' · by '}

            <Link
              className="font-semibold text-foreground hover:underline"
              params={{ username: deck.ownerUsername }}
              to="/users/$username"
            >
              {deck.ownerUsername}
            </Link>

            {' · updated '}

            {formatRelative(deck.updatedAt)}
          </>
        )}
        title={deck.name}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase">Total value</p>

          <Price
            amount={deckValue(deck.cards)}
            className="text-2xl"
          />

          <p className="mt-1 text-xs text-muted-foreground">
            {mainCount}

            {' main · '}

            {sideCount}

            {' sideboard'}
          </p>

          <SignedOut>
            <p className="mt-3 text-xs text-primary">Sign in to see which cards you own.</p>
          </SignedOut>
        </div>

        <div className="rounded-xl border bg-card p-4 md:col-span-2">
          <ManaCurve entries={deck.cards} />
        </div>

        <div className="rounded-xl border bg-card p-4">
          <TypeBreakdown entries={deck.cards} />
        </div>
      </div>

      <Section title="Deck list">
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {[...groups.entries()].map(([group, entries]) => (
            <div
              className="mb-4 break-inside-avoid rounded-xl border bg-card p-4"
              key={group}
            >
              <p className="mb-2 flex justify-between text-sm font-bold">
                {group}

                <span className="text-muted-foreground">{entries.reduce((sum, entry) => sum + entry.quantity, 0)}</span>
              </p>

              <ul className="space-y-1 text-sm">
                {entries.map(entry => (
                  <li
                    className="flex items-center gap-2"
                    key={entry.card.id + entry.section}
                  >
                    <span className="w-5 text-right text-muted-foreground tabular-nums">{entry.quantity}</span>

                    <Link
                      className="flex-1 truncate hover:text-primary"
                      params={{
                        card: entry.card.slug,
                        game: entry.card.gameId,
                        number: entry.card.number,
                        set: entry.card.setCode,
                      }}
                      to="/sets/$game/$set/$card/$number"
                    >
                      {entry.card.name}
                    </Link>

                    <Price
                      amount={entry.card.prices.nonfoil}
                      className="text-xs"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          description="Draw a random opening hand from the main deck. Tap a card to remove it."
          title="Opening hand simulator"
        >
          <ClientOnly fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
            <HandSimulator entries={deck.cards} />
          </ClientOnly>
        </Section>

        <Section
          description="Hypergeometric odds for drawing what you need."
          title="Draw odds"
        >
          <DrawOdds entries={deck.cards} />
        </Section>
      </div>

      <Section title={`Comments (${comments.length})`}>
        <SignedOut>
          <GatedPanel action="comment" />
        </SignedOut>

        <SignedIn>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault()
              // Ticket 02: persist via a comments service.
              toast.success('Comment posted')
              setDraft('')
            }}
          >
            <Textarea
              aria-label="Write a comment"
              onChange={event => setDraft(event.target.value)}
              placeholder="Share your thoughts on this deck"
              value={draft}
            />

            <Button
              disabled={!draft.trim()}
              type="submit"
            >
              <MessageSquare />
              Post comment
            </Button>
          </form>
        </SignedIn>

        {comments.length === 0
          ? <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
          : (
            <ul className="space-y-3">
              {comments.map(comment => (
                <li
                  className="rounded-xl border bg-card p-4 text-sm"
                  key={comment.id}
                >
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{comment.username}</span>

                    {' · '}

                    {formatRelative(comment.createdAt)}
                  </p>

                  <p className="mt-1">{comment.body}</p>
                </li>
              ))}
            </ul>
          )}
      </Section>
    </div>
  )
}
