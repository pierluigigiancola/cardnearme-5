import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound, useBlocker, useRouter } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Copy, FileText, FolderInput, Loader2, Save, Trash2, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { CardSearchBox } from '#/components/binder/CardSearchBox'
import { CardArt } from '#/components/cards/CardArt'
import { GameBadge, Price } from '#/components/cards/CardBits'
import { ManaCurve, TypeBreakdown, deckValue } from '#/components/decks/DeckTools'
import { ErrorState } from '#/components/layout/ErrorState'
import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Textarea } from '#/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { ConfirmDialog } from '#/components/workspace/ConfirmDialog'
import { QuantityStepper } from '#/components/workspace/QuantityStepper'
import { formatTextList, parseTextList } from '#/lib/cardListText'
import { deckCounts, validateDeck } from '#/lib/deckValidation'
import { cn } from '#/lib/utils'
import { useWorkspaceMutation } from '#/services/mutations'
import { gamesQuery, myDeckQuery, ownershipQuery } from '#/services/queries'
import { getServices } from '#/services/services'
import type { Card, DeckCard, DeckInput, DeckSection, OwnedDeck } from '#/services/types'

export const Route = createFileRoute('/x/decks/$deckId')({
  loader: async ({ context: { queryClient, user }, params }) => {
    const deck = await queryClient.ensureQueryData(myDeckQuery(user.id, params.deckId))
    if (!deck) throw notFound()
    return deck
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? 'Deck'} — deck builder | CardNearMe` }] }),
  component: DeckBuilderPage,
})

const sectionTitles: Record<DeckSection, string> = {
  commander: 'Commander',
  considering: 'Considering',
  mainboard: 'Main deck',
  sideboard: 'Sideboard',
}

interface Draft {
  name: string
  format: string
  description: string
  visibility: OwnedDeck['visibility']
  cards: DeckCard[]
}

function toInput(deck: OwnedDeck, draft: Draft): DeckInput {
  return {
    cards: draft.cards.map(entry => ({
      cardId: entry.card.id,
      quantity: entry.quantity,
      section: entry.section,
    })),
    description: draft.description,
    format: draft.format,
    gameId: deck.gameId,
    name: draft.name,
    visibility: draft.visibility,
  }
}

function DeckBuilderPage() {
  const { user } = Route.useRouteContext()
  const { deckId } = Route.useParams()
  const { data: deck } = useSuspenseQuery(myDeckQuery(user.id, deckId))
  if (!deck) return <p className="page-wrap py-24 text-center text-muted-foreground">This deck no longer exists.</p>
  // Re-mount the editor when another deck (or a saved version) loads.
  return (
    <DeckEditor
      deck={deck}
      key={`${deck.id}-${deck.updatedAt}`}
    />
  )
}

function DeckEditor({ deck }: { deck: OwnedDeck }) {
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const { data: games } = useSuspenseQuery(gamesQuery())
  const game = games.find(candidate => candidate.id === deck.gameId)
  const [draft, setDraft] = useState<Draft>({
    cards: deck.cards,
    description: deck.description,
    format: deck.format,
    name: deck.name,
    visibility: deck.visibility,
  })
  const [dirty, setDirty] = useState(false)
  const [addTo, setAddTo] = useState<DeckSection>(deck.format === 'Commander' && !deck.cards.some(entry => entry.section === 'commander') ? 'commander' : 'mainboard')
  const [textOpen, setTextOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const leaving = useRef(false)

  const change = (next: Partial<Draft>) => {
    setDraft(previous => ({
      ...previous,
      ...next,
    }))
    setDirty(true)
  }
  const setCards = (update: (cards: DeckCard[]) => DeckCard[]) => {
    setDraft(previous => ({
      ...previous,
      cards: update(previous.cards),
    }))
    setDirty(true)
  }

  useBlocker({
    enableBeforeUnload: dirty,
    shouldBlockFn: () => dirty && !leaving.current && !window.confirm('Leave without saving your deck?'),
  })

  const cardIds = useMemo(() => [...new Set(draft.cards.map(entry => entry.card.id))].sort(), [draft.cards])
  const ownershipResult = useQuery({
    ...ownershipQuery(user.id, cardIds),
    enabled: cardIds.length > 0,
  })
  const ownership = ownershipResult.data ?? {}
  const issues = validateDeck({
    cards: draft.cards,
    format: draft.format,
    gameId: deck.gameId,
  })
  const counts = deckCounts(draft.cards)
  const sections: DeckSection[] = draft.format === 'Commander' ? ['commander', 'mainboard', 'sideboard', 'considering'] : ['mainboard', 'sideboard', 'considering']

  const save = useWorkspaceMutation((services, input: DeckInput) => services.deckBuilder.update(deck.id, input))
  const remove = useWorkspaceMutation(services => services.deckBuilder.remove(deck.id))

  const addCard = (card: Card, section = addTo) => setCards((cards) => {
    const existing = cards.find(entry => entry.card.id === card.id && entry.section === section)
    if (existing) return cards.map(entry => (entry === existing ? {
      ...entry,
      quantity: entry.quantity + 1,
    } : entry))
    return [...cards, {
      card,
      quantity: 1,
      section,
    }]
  })

  return (
    <div className="page-wrap pb-12">
      <PageHeader
        actions={(
          <>
            <Button
              onClick={() => setTextOpen(true)}
              variant="outline"
            >
              <FileText />
              Import / export
            </Button>

            <Button
              onClick={() => setConfirmDelete(true)}
              variant="ghost"
            >
              <Trash2 />
              Delete
            </Button>

            <Button
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate(toInput(deck, draft), {
                onSuccess: () => {
                  setDirty(false)
                  toast.success('Deck saved')
                },
              })}
            >
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}

              {dirty ? 'Save changes' : 'Saved'}
            </Button>
          </>
        )}
        crumbs={[{
          href: '/x/decks',
          label: 'Your decks',
        }, { label: draft.name || 'Untitled deck' }]}
        title={(
          <Input
            aria-label="Deck name"
            className="h-auto border-transparent bg-transparent px-0 text-3xl font-extrabold shadow-none focus-visible:border-input md:text-3xl dark:bg-transparent"
            maxLength={80}
            onChange={event => change({ name: event.target.value })}
            value={draft.name}
          />
        )}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {game && <GameBadge game={game} />}

        <Select
          onValueChange={format => change({ format })}
          value={draft.format}
        >
          <SelectTrigger
            aria-label="Format"
            className="w-40"
          >
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {(game?.formats ?? [draft.format]).map(format => (
              <SelectItem
                key={format}
                value={format}
              >
                {format}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={value => change({ visibility: value === 'public' ? 'public' : 'private' })}
          value={draft.visibility}
        >
          <SelectTrigger
            aria-label="Visibility"
            className="w-32"
          >
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="private">Private</SelectItem>

            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {`${counts.commander + counts.mainboard} main · ${counts.sideboard} side · `}

          <Price amount={deckValue(draft.cards.filter(entry => entry.section !== 'considering'))} />
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
            <div className="min-w-64 flex-1">
              <CardSearchBox
                gameId={deck.gameId}
                onPick={card => addCard(card)}
                placeholder={`Add a card to ${sectionTitles[addTo].toLowerCase()}`}
              />
            </div>

            <ToggleGroup
              aria-label="Add to section"
              onValueChange={(value) => {
                const next = sections.find(section => section === value)
                if (next) setAddTo(next)
              }}
              size="sm"
              type="single"
              value={addTo}
              variant="outline"
            >
              {sections.map(section => (
                <ToggleGroupItem
                  key={section}
                  value={section}
                >
                  {sectionTitles[section]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {ownershipResult.isError && (
            <ErrorState
              className="rounded-xl border border-destructive/40"
              compact
              error={ownershipResult.error}
              onRetry={() => void ownershipResult.refetch()}
              title="Could not check which cards you own"
            />
          )}

          {sections.map((section) => {
            const entries = draft.cards.filter(entry => entry.section === section)
            if (entries.length === 0 && section !== 'mainboard' && section !== 'commander') return null
            return (
              <section key={section}>
                <h2 className="mb-2 flex items-center gap-2 font-bold">
                  {sectionTitles[section]}

                  <span className="text-sm font-normal text-muted-foreground tabular-nums">{entries.reduce((total, entry) => total + entry.quantity, 0)}</span>
                </h2>

                {entries.length === 0
                  ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{section === 'commander' ? 'Search above to pick your commander.' : 'Search above to add cards.'}</p>
                  : (
                    <ul className="divide-y rounded-xl border bg-card">
                      {entries.map((entry) => {
                        const owned = ownership[entry.card.id]?.collection ?? 0
                        return (
                          <li
                            className="flex items-center gap-3 px-3 py-2"
                            key={`${entry.section}-${entry.card.id}`}
                          >
                            <CardArt
                              card={entry.card}
                              className="w-8 shrink-0"
                            />

                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{entry.card.name}</p>

                              <p className="truncate text-xs text-muted-foreground">{entry.card.typeLine}</p>
                            </div>

                            <span
                              className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', owned >= entry.quantity ? 'bg-want/15 text-want' : 'bg-muted text-muted-foreground')}
                              title="Copies in your collection"
                            >
                              {`Own ${owned}`}
                            </span>

                            <Price
                              amount={(entry.card.prices.nonfoil ?? 0) * entry.quantity}
                              className="w-16 text-right text-sm"
                            />

                            <QuantityStepper
                              max={99}
                              onChange={quantity => setCards(cards => cards.map(other => (other === entry ? {
                                ...other,
                                quantity,
                              } : other)))}
                              value={entry.quantity}
                            />

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  aria-label={`Move ${entry.card.name}`}
                                  size="icon-xs"
                                  variant="ghost"
                                >
                                  <FolderInput />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end">
                                {sections.filter(other => other !== section).map(other => (
                                  <DropdownMenuItem
                                    key={other}
                                    onSelect={() => setCards(cards => cards.map(candidate => (candidate === entry ? {
                                      ...candidate,
                                      section: other,
                                    } : candidate)))}
                                  >
                                    {`Move to ${sectionTitles[other].toLowerCase()}`}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                              aria-label={`Remove ${entry.card.name}`}
                              onClick={() => setCards(cards => cards.filter(candidate => candidate !== entry))}
                              size="icon-xs"
                              variant="ghost"
                            >
                              <X />
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
              </section>
            )
          })}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 font-semibold">{`${draft.format} legality`}</p>

            {issues.length === 0
              ? (
                <p className="flex items-center gap-2 text-sm text-want">
                  <CheckCircle2 className="size-4" />
                  Deck is legal
                </p>
              )
              : (
                <ul className="space-y-1.5 text-sm">
                  {issues.slice(0, 12).map(issue => (
                    <li
                      className={cn('flex gap-2', issue.level === 'error' ? 'text-destructive-foreground' : 'text-muted-foreground')}
                      key={issue.message}
                    >
                      <AlertTriangle className={cn('mt-0.5 size-4 shrink-0', issue.level === 'error' ? 'text-destructive' : 'text-have')} />

                      {issue.message}
                    </li>
                  ))}

                  {issues.length > 12 && <li className="text-xs text-muted-foreground">{`+${issues.length - 12} more`}</li>}
                </ul>
              )}
          </div>

          {deck.gameId === 'mtg' && draft.cards.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <ManaCurve entries={draft.cards.filter(entry => entry.section === 'mainboard' || entry.section === 'commander')} />
            </div>
          )}

          {draft.cards.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <TypeBreakdown entries={draft.cards.filter(entry => entry.section !== 'considering')} />
            </div>
          )}

          <div className="space-y-1.5 rounded-xl border bg-card p-4">
            <Label htmlFor="deck-description">Description</Label>

            <Textarea
              id="deck-description"
              maxLength={2000}
              onChange={event => change({ description: event.target.value })}
              placeholder="Game plan, budget notes, upgrades…"
              rows={5}
              value={draft.description}
            />
          </div>
        </aside>
      </div>

      <DeckTextDialog
        cards={draft.cards}
        deckName={draft.name}
        gameId={deck.gameId}
        onImport={(cards) => {
          setCards(() => cards)
          setTextOpen(false)
        }}
        onOpenChange={setTextOpen}
        open={textOpen}
      />

      <ConfirmDialog
        confirmLabel="Delete deck"
        description="This deck list is removed for good. Your cards stay in your binder."
        onConfirm={() => {
          leaving.current = true
          // mutateAsync: the editor unmounts once the deck query refetches as empty.
          remove.mutateAsync(undefined)
            .then(() => {
              toast.success('Deck deleted')
              return router.navigate({ to: '/x/decks' })
            })
            .catch(() => {
              leaving.current = false
            })
        }}
        onOpenChange={setConfirmDelete}
        open={confirmDelete}
        pending={remove.isPending}
        title={`Delete ${deck.name}?`}
      />
    </div>
  )
}

function DeckTextDialog({ cards, deckName, gameId, onImport, onOpenChange, open }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: DeckCard[];
  deckName: string;
  gameId: OwnedDeck['gameId'];
  onImport: (cards: DeckCard[]) => void
}) {
  const exported = formatTextList(cards)
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [missing, setMissing] = useState<string[]>([])

  const importText = async () => {
    const parsed = parseTextList(text)
    if (parsed.rows.length === 0) {
      toast.error('No cards found in this list')
      return
    }
    setPending(true)
    try {
      const services = await getServices()
      const resolved: DeckCard[] = []
      const unmatched: string[] = []
      for (const row of parsed.rows) {
        const results = await services.catalogue.searchCards(row.name, {
          gameId,
          limit: 20,
        })
        const named = results.filter(card => card.name.toLowerCase() === row.name.toLowerCase())
        const card = named.find(candidate => candidate.setCode === row.setCode && (!row.number || candidate.number === row.number))
          ?? named.at(0)
        if (card) resolved.push({
          card,
          quantity: row.quantity,
          section: row.section,
        })
        else unmatched.push(row.name)
      }
      setMissing(unmatched)
      if (resolved.length > 0) {
        onImport(resolved)
        toast.success(`Imported ${resolved.length} cards${unmatched.length > 0 ? ` (${unmatched.length} not found)` : ''}`)
      }
    }
    finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={open}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import / export</DialogTitle>

          <DialogDescription>Copy the list into other tools, or paste one to replace this deck’s cards.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deck-export">Export</Label>

            <Textarea
              className="h-64 font-mono text-xs"
              id="deck-export"
              readOnly
              value={exported || '// No cards yet'}
            />

            <Button
              disabled={!exported}
              onClick={() => {
                void navigator.clipboard.writeText(`// ${deckName}\n${exported}`)
                toast.success('Deck list copied')
              }}
              size="sm"
              variant="outline"
            >
              <Copy />
              Copy
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deck-import">Import (replaces the list)</Label>

            <Textarea
              className="h-64 font-mono text-xs"
              id="deck-import"
              onChange={event => setText(event.target.value)}
              placeholder={'Commander\n1 Card Name\n\nDeck\n4 Card Name (SET) 12\n\nSideboard\n2 Card Name'}
              value={text}
            />

            {missing.length > 0 && <p className="text-xs text-have">{`Not found: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`}</p>}

            <Button
              disabled={!text.trim() || pending}
              onClick={() => void importText()}
              size="sm"
            >
              {pending && <Loader2 className="animate-spin" />}
              Import list
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
