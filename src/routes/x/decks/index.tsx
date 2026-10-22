import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { EyeOff, Layers, Plus, Share2, Sparkles, Swords } from 'lucide-react'
import { useState } from 'react'

import { GameBadge } from '#/components/cards/CardBits'
import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { formatRelative } from '#/lib/format'
import { useWorkspaceMutation } from '#/services/mutations'
import { gamesQuery, myDecksQuery } from '#/services/queries'
import type { DeckInput, GameId } from '#/services/types'

export const Route = createFileRoute('/x/decks/')({
  loader: async ({ context: { queryClient, user } }) => {
    await queryClient.ensureQueryData(myDecksQuery(user.id))
  },
  head: () => ({ meta: [{ title: 'Your decks | CardNearMe' }] }),
  component: YourDecksPage,
})

const features = [
  {
    description: 'See which cards you already own and what is still missing.',
    icon: Layers,
    title: 'Owned counts',
  },
  {
    description: 'Publish a list for your playgroup or keep brews private.',
    icon: Share2,
    title: 'Share builds',
  },
  {
    description: 'Build for every game you play, each with its own formats.',
    icon: Sparkles,
    title: 'Multi-game',
  },
]

function YourDecksPage() {
  const { user } = Route.useRouteContext()
  const { data: decks } = useSuspenseQuery(myDecksQuery(user.id))
  const { data: games } = useSuspenseQuery(gamesQuery())
  const [creating, setCreating] = useState(false)

  return (
    <div className="page-wrap pb-12">
      <PageHeader
        actions={decks.length > 0 && (
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Create deck
          </Button>
        )}
        description="Build, manage and organise your decks."
        title="Your decks"
      />

      {decks.length === 0
        ? (
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed p-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Swords className="size-7" />
            </span>

            <div>
              <p className="text-2xl font-bold">Build your first deck</p>

              <p className="mt-1 text-muted-foreground">Track lists, check legality and see what you still need to trade for.</p>
            </div>

            <Button
              onClick={() => setCreating(true)}
              size="lg"
            >
              <Plus />
              Create deck
            </Button>

            <ul className="grid w-full max-w-3xl gap-3 text-left sm:grid-cols-3">
              {features.map(feature => (
                <li
                  className="rounded-xl border bg-card p-4"
                  key={feature.title}
                >
                  <feature.icon className="size-5 text-primary" />

                  <p className="mt-2 font-semibold">{feature.title}</p>

                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )
        : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => {
              const game = games.find(candidate => candidate.id === deck.gameId)
              const count = deck.cards.reduce((total, entry) => total + (entry.section === 'considering' ? 0 : entry.quantity), 0)
              return (
                <li key={deck.id}>
                  <Link
                    className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition hover:border-primary/60"
                    params={{ deckId: deck.id }}
                    to="/x/decks/$deckId"
                  >
                    <span className="flex items-center gap-2">
                      {game && <GameBadge game={game} />}

                      <span className="text-xs text-muted-foreground">{deck.format}</span>

                      {deck.visibility === 'private' && <EyeOff className="ml-auto size-4 text-muted-foreground" />}
                    </span>

                    <span className="text-lg font-semibold">{deck.name}</span>

                    <span className="mt-auto text-xs text-muted-foreground">{`${count} cards · updated ${formatRelative(deck.updatedAt)}`}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

      <CreateDeckDialog
        onOpenChange={setCreating}
        open={creating}
      />
    </div>
  )
}

function CreateDeckDialog({ onOpenChange, open }: {
  open: boolean;
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { data: games } = useSuspenseQuery(gamesQuery())
  const builderGames = games.filter(game => game.capabilities.deckBuilder)
  const [name, setName] = useState('')
  const [gameId, setGameId] = useState<GameId>('mtg')
  const game = builderGames.find(candidate => candidate.id === gameId) ?? builderGames.at(0)
  const [format, setFormat] = useState<string | undefined>()
  const selectedFormat = format && game?.formats.includes(format) ? format : game?.formats.at(0) ?? 'Standard'
  const create = useWorkspaceMutation((services, input: DeckInput) => services.deckBuilder.create(input))

  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!game) return
            create.mutate({
              cards: [],
              description: '',
              format: selectedFormat,
              gameId: game.id,
              name,
              visibility: 'private',
            }, {
              onSuccess: (deck) => {
                onOpenChange(false)
                void router.navigate({
                  params: { deckId: deck.id },
                  to: '/x/decks/$deckId',
                })
              },
            })
          }}
        >
          <DialogHeader>
            <DialogTitle>Create deck</DialogTitle>

            <DialogDescription>Name it and pick the game and format — you can add cards next.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="deck-name">Name</Label>

            <Input
              autoFocus
              id="deck-name"
              maxLength={80}
              onChange={event => setName(event.target.value)}
              placeholder="e.g. Mono Red Aggro"
              required
              value={name}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Game</Label>

              <Select
                onValueChange={value => setGameId(builderGames.find(candidate => candidate.id === value)?.id ?? 'mtg')}
                value={game?.id}
              >
                <SelectTrigger
                  aria-label="Game"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {builderGames.map(option => (
                    <SelectItem
                      key={option.id}
                      value={option.id}
                    >
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Format</Label>

              <Select
                onValueChange={setFormat}
                value={selectedFormat}
              >
                <SelectTrigger
                  aria-label="Format"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {(game?.formats ?? []).map(option => (
                    <SelectItem
                      key={option}
                      value={option}
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>

            <Button
              disabled={!name.trim() || create.isPending}
              type="submit"
            >
              Create and add cards
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
