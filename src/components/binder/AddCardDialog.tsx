import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useSignedInViewer } from '#/auth/useViewer'
import { CardArt } from '#/components/cards/CardArt'
import { Price } from '#/components/cards/CardBits'
import { ErrorState } from '#/components/layout/ErrorState'
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
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { QuantityStepper } from '#/components/workspace/QuantityStepper'
import { conditionLabels, conditions, finishLabels, isCondition, isFinish, isLanguage, languageLabels, languages } from '#/lib/cardOptions'
import { useWorkspaceMutation } from '#/services/mutations'
import { cardSearchQuery, printingsQuery, tradeListsQuery } from '#/services/queries'
import type { BinderItemInput, BinderSection, Card, Condition, Finish, Language } from '#/services/types'

export const sectionLabels: Record<BinderSection, string> = {
  collection: 'Collection',
  haves: 'Haves',
  wants: 'Wants',
}

export function isBinderSection(value: unknown): value is BinderSection {
  return value === 'collection' || value === 'haves' || value === 'wants'
}

/**
 * Adds a card to the viewer's collection or a trade list: pick the card and
 * printing, then condition, finish, language and quantity.
 */
export function AddCardDialog({ card: presetCard, defaultListId, defaultSection, onOpenChange, open }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSection: BinderSection;
  defaultListId?: string;
  /** Skip the search step (e.g. from a card page). */
  card?: Card
}) {
  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={open}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {open && (
          <AddCardForm
            defaultListId={defaultListId}
            defaultSection={defaultSection}
            onDone={() => onOpenChange(false)}
            presetCard={presetCard}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddCardForm({ defaultListId, defaultSection, onDone, presetCard }: {
  defaultSection: BinderSection;
  defaultListId?: string;
  presetCard?: Card;
  onDone: () => void
}) {
  const [picked, setPicked] = useState<Card | null>(presetCard ?? null)

  return (
    <>
      <DialogHeader>
        <DialogTitle>{presetCard ? `Add ${presetCard.name}` : 'Add a card'}</DialogTitle>

        <DialogDescription>Track it in your collection or put it on a haves or wants list.</DialogDescription>
      </DialogHeader>

      {picked
        ? (
          <CardDetailsStep
            card={picked}
            defaultListId={defaultListId}
            defaultSection={defaultSection}
            key={picked.id}
            onBack={presetCard ? undefined : () => setPicked(null)}
            onDone={onDone}
          />
        )
        : <CardSearchStep onPick={setPicked} />}
    </>
  )
}

function CardSearchStep({ onPick }: { onPick: (card: Card) => void }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(timeout)
  }, [query])

  const search = useQuery({
    ...cardSearchQuery(debounced),
    enabled: debounced.trim().length > 1,
  })
  const { data: results = [], isFetching } = search

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          aria-label="Search cards"
          autoFocus
          className="pl-9"
          onChange={event => setQuery(event.target.value)}
          placeholder="Search a card by name"
          value={query}
        />

        {isFetching && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      <ul className="max-h-80 space-y-1 overflow-y-auto">
        {results.map(result => (
          <li key={result.id}>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-accent"
              onClick={() => onPick(result)}
              type="button"
            >
              <CardArt
                card={result}
                className="w-8 shrink-0"
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{result.name}</span>

                <span className="block truncate text-xs text-muted-foreground">{result.setName}</span>
              </span>

              <Price amount={result.prices.nonfoil} />
            </button>
          </li>
        ))}

        {search.isError && (
          <li>
            <ErrorState
              compact
              error={search.error}
              onRetry={() => void search.refetch()}
              title="Search failed"
            />
          </li>
        )}

        {debounced.trim().length > 1 && query === debounced && !isFetching && !search.isError && results.length === 0 && <li className="px-2 py-4 text-center text-sm text-muted-foreground">No cards found.</li>}
      </ul>
    </div>
  )
}

function CardDetailsStep({ card, defaultListId, defaultSection, onBack, onDone }: {
  card: Card;
  defaultSection: BinderSection;
  defaultListId?: string;
  /** Back to the search step; omitted when the card was given. */
  onBack?: () => void;
  onDone: () => void
}) {
  const viewer = useSignedInViewer()
  const [printingId, setPrintingId] = useState(card.id)
  const [section, setSection] = useState<BinderSection>(defaultSection)
  const [listId, setListId] = useState<string | undefined>(defaultListId)
  const [condition, setCondition] = useState<Condition>('NM')
  const [finish, setFinish] = useState<Finish>(card.finishes.at(0) ?? 'nonfoil')
  const [language, setLanguage] = useState<Language>('en')
  const [quantity, setQuantity] = useState(1)

  const printingsResult = useQuery(printingsQuery(card))
  const listsResult = useQuery({
    ...tradeListsQuery(viewer.id, { type: section === 'wants' ? 'wants' : 'haves' }),
    enabled: section !== 'collection',
  })
  const otherPrintings = printingsResult.data ?? []
  const lists = listsResult.data ?? []
  // Without the lists we can't tell which one to add to, so don't guess.
  const listsUnavailable = section !== 'collection' && listsResult.isError

  const printings = [card, ...otherPrintings]
  const printing = printings.find(candidate => candidate.id === printingId) ?? card
  const compatibleLists = lists.filter(list => !list.gameId || list.gameId === printing.gameId)
  const selectedList = compatibleLists.find(list => list.id === listId) ?? compatibleLists.at(0)

  const add = useWorkspaceMutation((services, items: BinderItemInput[]) => services.binder.addItems(items))

  const submit = (another: boolean) => {
    add.mutate([{
      cardId: printing.id,
      condition,
      finish: printing.finishes.includes(finish) ? finish : 'nonfoil',
      language,
      listId: section === 'collection' ? null : selectedList?.id ?? null,
      quantity,
      section,
    }], {
      onSuccess: () => {
        toast.success(`Added ${quantity}× ${printing.name} to ${section === 'collection' ? 'your collection' : selectedList?.name ?? sectionLabels[section]}`)
        if (another && onBack) onBack()
        else onDone()
      },
    })
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
        <div className="space-y-2">
          <CardArt
            card={printing}
            finish={finish}
          />

          {onBack && (
            <Button
              className="w-full"
              onClick={onBack}
              size="sm"
              type="button"
              variant="ghost"
            >
              Choose another card
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Add to</Label>

            <ToggleGroup
              aria-label="Binder section"
              className="w-full"
              onValueChange={value => isBinderSection(value) && setSection(value)}
              type="single"
              value={section}
              variant="outline"
            >
              {(['haves', 'wants', 'collection'] as const).map(option => (
                <ToggleGroupItem
                  className="flex-1"
                  key={option}
                  value={option}
                >
                  {sectionLabels[option]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {section !== 'collection' && (
            <Field label="List">
              {listsResult.isError
                ? (
                  <ErrorState
                    compact
                    error={listsResult.error}
                    onRetry={() => void listsResult.refetch()}
                    title="Could not load your lists"
                  />
                )
                : (
                  <Select
                    onValueChange={setListId}
                    value={selectedList?.id ?? 'default'}
                  >
                    <SelectTrigger
                      aria-label="List"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {compatibleLists.length === 0 && <SelectItem value="default">{`New “My ${section}” list`}</SelectItem>}

                      {compatibleLists.map(list => (
                        <SelectItem
                          key={list.id}
                          value={list.id}
                        >
                          {list.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
            </Field>
          )}

          <Field label="Printing">
            <Select
              onValueChange={(value) => {
                setPrintingId(value)
                const next = printings.find(candidate => candidate.id === value)
                if (next && !next.finishes.includes(finish)) setFinish(next.finishes.at(0) ?? 'nonfoil')
              }}
              value={printing.id}
            >
              <SelectTrigger
                aria-label="Printing"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {printings.map(candidate => (
                  <SelectItem
                    key={candidate.id}
                    value={candidate.id}
                  >
                    {`${candidate.setName} · #${candidate.number}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {printingsResult.isError && (
              <ErrorState
                compact
                error={printingsResult.error}
                onRetry={() => void printingsResult.refetch()}
                title="Could not load other printings"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={section === 'wants' ? 'Minimum condition' : 'Condition'}>
              <Select
                onValueChange={value => isCondition(value) && setCondition(value)}
                value={condition}
              >
                <SelectTrigger
                  aria-label="Condition"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {conditions.map(option => (
                    <SelectItem
                      key={option}
                      value={option}
                    >
                      {`${option} · ${conditionLabels[option]}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Language">
              <Select
                onValueChange={value => isLanguage(value) && setLanguage(value)}
                value={language}
              >
                <SelectTrigger
                  aria-label="Language"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {languages.map(option => (
                    <SelectItem
                      key={option}
                      value={option}
                    >
                      {languageLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Finish">
              <Select
                onValueChange={value => isFinish(value) && setFinish(value)}
                value={finish}
              >
                <SelectTrigger
                  aria-label="Finish"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {printing.finishes.map(option => (
                    <SelectItem
                      key={option}
                      value={option}
                    >
                      {finishLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Quantity">
              <QuantityStepper
                className="h-9"
                onChange={setQuantity}
                value={quantity}
              />
            </Field>
          </div>

          <p className="text-sm text-muted-foreground">
            {'Market price '}

            <Price amount={printing.prices[finish] ?? printing.prices.nonfoil} />
          </p>
        </div>
      </div>

      <DialogFooter>
        {onBack && (
          <Button
            disabled={add.isPending || listsUnavailable}
            onClick={() => submit(true)}
            type="button"
            variant="outline"
          >
            Add and continue
          </Button>
        )}

        <Button
          disabled={add.isPending || listsUnavailable}
          onClick={() => submit(false)}
          type="button"
        >
          {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          Add
        </Button>
      </DialogFooter>
    </>
  )
}

function Field({ children, label }: {
  label: string;
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>

      {children}
    </div>
  )
}
