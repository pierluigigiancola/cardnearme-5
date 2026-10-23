import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ArrowLeftRight, Loader2, MapPin, Scale, Search, Sparkles, X } from 'lucide-react'
import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { TraderAvatar } from './TraderAvatar'

import { useSignedInViewer } from '#/auth/useViewer'
import { CardArt } from '#/components/cards/CardArt'
import { ConditionBadge, FinishBadge, Price } from '#/components/cards/CardBits'
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
import { Textarea } from '#/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { QuantityStepper } from '#/components/workspace/QuantityStepper'
import { tradeFromPerspective, tradeValue } from '#/domain'
import { formatPrice } from '#/lib/format'
import { usePricingSource } from '#/lib/pricing'
import { cn } from '#/lib/utils'
import { useWorkspaceMutation } from '#/services/mutations'
import { tradeContextQuery } from '#/services/queries'
import type { Card, Condition, Finish, Language, Trade, TradeContext, TradeDraft, TradeItem } from '#/services/types'

export interface TradeBuilderRequest {
  partner: string
  /** A card of the partner's (haves or wants) the trade starts from. */
  item?: TradeItem
  /** Pre-select every match between both traders' lists. */
  useMatches?: boolean
  /** Edit or counter an existing pending trade. */
  trade?: Trade
}

type OpenTradeBuilder = (request: TradeBuilderRequest) => void

const TradeBuilderContext = createContext<OpenTradeBuilder | null>(null)

/** Hosts the trade builder modal; open it from anywhere with `useTradeBuilder()`. */
export function TradeBuilderProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<TradeBuilderRequest | null>(null)

  return (
    <TradeBuilderContext value={setRequest}>
      {children}

      <Dialog
        onOpenChange={open => !open && setRequest(null)}
        open={request !== null}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          {request && (
            <TradeBuilder
              onClose={() => setRequest(null)}
              request={request}
            />
          )}
        </DialogContent>
      </Dialog>
    </TradeBuilderContext>
  )
}

export function useTradeBuilder() {
  const context = useContext(TradeBuilderContext)
  if (!context) throw new Error('useTradeBuilder must be used inside TradeBuilderProvider')
  return context
}

function TradeBuilder({ onClose, request }: {
  request: TradeBuilderRequest;
  onClose: () => void
}) {
  const viewer = useSignedInViewer()
  const { data: context, error, isPending } = useQuery(tradeContextQuery(viewer.id, request.partner))

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <DialogTitle className="sr-only">Loading trade builder</DialogTitle>

        <Loader2 className="size-5 animate-spin" />
        Loading both binders…
      </div>
    )
  }
  if (error) {
    return (
      <div className="py-12 text-center">
        <DialogTitle>Trade unavailable</DialogTitle>

        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
    )
  }
  return (
    <TradeBuilderForm
      context={context}
      onClose={onClose}
      request={request}
    />
  )
}

interface Selection {
  quantity: number
  price: number
}

type MeetupChoice =
  | {
    kind: 'store';
    storeSlug: string
  }
  | {
    kind: 'custom';
    name: string;
    address: string
  }

interface PickableItem {
  id: string
  card: Card
  condition: Condition
  finish: Finish
  language: Language
  quantity: number
  price: number
  /** Matches the other trader's list. */
  matched: boolean
  note?: string
}

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString()
    .slice(0, 16)
}

function initialState(context: TradeContext, request: TradeBuilderRequest, me: string) {
  const give = new Map<string, Selection>()
  const get = new Map<string, Selection>()
  let cash = {
    amount: 0,
    payer: 'me' as 'me' | 'partner',
  }
  const firstStore = context.sharedStores.at(0)
  let meetup: MeetupChoice = firstStore
    ? {
      kind: 'store',
      storeSlug: firstStore.slug,
    }
    : {
      address: '',
      kind: 'custom',
      name: context.meetingPlaces[0] ?? '',
    }
  let meetAt = ''
  let note = ''

  if (request.trade) {
    const sides = tradeFromPerspective(request.trade, me)
    for (const line of sides.give) give.set(line.sourceId, {
      price: line.price,
      quantity: line.quantity,
    })
    for (const line of sides.get) get.set(line.sourceId, {
      price: line.price,
      quantity: line.quantity,
    })
    if (request.trade.cashPayer) {
      cash = {
        amount: request.trade.cashAmount,
        payer: request.trade.cashPayer === me ? 'me' : 'partner',
      }
    }
    const current = request.trade.meetup
    if (current) {
      meetup = current.kind === 'store'
        ? {
          kind: 'store',
          storeSlug: current.storeSlug,
        }
        : {
          address: current.address,
          kind: 'custom',
          name: current.name,
        }
    }
    meetAt = toLocalInput(request.trade.meetAt)
    note = request.trade.note
    return {
      cash,
      get,
      give,
      meetAt,
      meetup,
      note,
    }
  }

  const item = request.item
  if (item?.listType === 'haves') {
    get.set(item.id, {
      price: item.price,
      quantity: 1,
    })
  }
  if (item?.listType === 'wants') {
    const mine = context.myItems.find(candidate => candidate.card.name === item.card.name)
    if (mine) give.set(mine.id, {
      price: mine.price,
      quantity: 1,
    })
  }
  const suggestedGive = request.useMatches ? context.suggestedGive : context.suggestedGive.slice(0, 2)
  for (const sourceId of suggestedGive) {
    const mine = context.myItems.find(candidate => candidate.id === sourceId)
    if (mine && !give.has(mine.id)) give.set(mine.id, {
      price: mine.price,
      quantity: 1,
    })
  }
  if (request.useMatches) {
    for (const sourceId of context.suggestedGet) {
      const theirs = context.partnerHaves.find(candidate => candidate.id === sourceId)
      if (theirs && !get.has(theirs.id)) get.set(theirs.id, {
        price: theirs.price,
        quantity: 1,
      })
    }
  }
  return {
    cash,
    get,
    give,
    meetAt,
    meetup,
    note,
  }
}

function TradeBuilderForm({ context, onClose, request }: {
  context: TradeContext;
  request: TradeBuilderRequest;
  onClose: () => void
}) {
  const viewer = useSignedInViewer()
  const router = useRouter()
  const source = usePricingSource()
  const [initial] = useState(() => initialState(context, request, viewer.username))
  const [give, setGive] = useState(initial.give)
  const [get, setGet] = useState(initial.get)
  const [cash, setCash] = useState(initial.cash)
  const [meetup, setMeetup] = useState<MeetupChoice>(initial.meetup)
  const [meetAt, setMeetAt] = useState(initial.meetAt)
  const [note, setNote] = useState(initial.note)
  const partner = context.partner.username
  // Shared stores, plus the store of the trade being edited if it is not shared.
  const storeOptions = useMemo(() => {
    const options = context.sharedStores.map(store => ({
      address: store.address,
      name: store.name,
      slug: store.slug,
    }))
    const current = request.trade?.meetup
    if (current?.kind === 'store' && !options.some(option => option.slug === current.storeSlug)) {
      options.push({
        address: current.address,
        name: current.name,
        slug: current.storeSlug,
      })
    }
    return options
  }, [context, request.trade])

  const myItems = useMemo(() => {
    const wanted = new Set(context.suggestedGive)
    return context.myItems.map((item): PickableItem => ({
      ...item,
      matched: wanted.has(item.id),
      note: item.forTradeQuantity > 0 ? `${item.forTradeQuantity} for trade` : 'Collection',
    }))
  }, [context])
  const theirItems = useMemo(() => {
    const wanted = new Set(context.suggestedGet)
    return context.partnerHaves.map((item): PickableItem => ({
      ...item,
      matched: wanted.has(item.id),
    }))
  }, [context])

  const myCards = tradeValue([...give.values()])
  const theirCards = tradeValue([...get.values()])
  const myTotal = myCards + (cash.payer === 'me' ? cash.amount : 0)
  const theirTotal = theirCards + (cash.payer === 'partner' ? cash.amount : 0)
  // `|| 0` drops -0, which would format as "-€0.00".
  const difference = Math.round((myTotal - theirTotal) * 100) / 100 || 0

  const balance = () => {
    const cardsDifference = Math.round((myCards - theirCards) * 100) / 100
    setCash({
      amount: Math.abs(cardsDifference),
      payer: cardsDifference > 0 ? 'partner' : 'me',
    })
  }

  const propose = useWorkspaceMutation((services, draft: TradeDraft) =>
    (request.trade ? services.trades.revise(request.trade.id, draft) : services.trades.propose(draft)))

  const submit = () => {
    const toLines = (selection: Map<string, Selection>) =>
      [...selection.entries()].map(([sourceId, line]) => ({
        price: line.price,
        quantity: line.quantity,
        sourceId,
      }))
    const draft: TradeDraft = {
      cash: cash.amount > 0 ? cash : null,
      get: toLines(get),
      give: toLines(give),
      meetAt: meetAt ? new Date(meetAt).toISOString() : null,
      meetup: meetup.kind === 'store'
        ? (() => {
          const store = storeOptions.find(candidate => candidate.slug === meetup.storeSlug)
          return {
            address: store?.address ?? '',
            kind: 'store' as const,
            name: store?.name ?? '',
            storeSlug: meetup.storeSlug,
          }
        })()
        : meetup.name.trim()
          ? meetup
          : null,
      note,
      partner,
    }
    propose.mutate(draft, {
      onSuccess: (trade) => {
        toast.success(request.trade ? 'Proposal updated' : `Proposal sent to ${partner}`)
        onClose()
        void router.navigate({
          params: { chatId: trade.chatId },
          to: '/x/inbox/$chatId',
        })
      },
    })
  }

  const empty = give.size + get.size === 0

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <TraderAvatar
            className="size-9"
            hue={context.partner.avatarHue}
            online={context.partner.online}
            username={partner}
          />

          {request.trade ? (request.trade.awaiting === viewer.username ? 'Counter-offer to ' : 'Edit proposal to ') : 'Trade with '}

          {partner}
        </DialogTitle>

        <DialogDescription>Pick the cards on both sides, balance the values and agree where to meet.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <TradeSide
          available={myItems}
          emptyHint="Add cards from your haves or collection"
          matchedLabel={`${partner} wants`}
          onChange={setGive}
          selection={give}
          title="You give"
          total={myCards}
        />

        <TradeSide
          available={theirItems}
          emptyHint={`Add cards from ${partner}'s haves`}
          matchedLabel="On your wants"
          onChange={setGet}
          selection={get}
          title="You get"
          total={theirCards}
        />
      </div>

      <div className="grid gap-4 rounded-xl border bg-muted/30 p-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Scale className="size-4" />
            Cash balance
          </Label>

          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              aria-label="Who adds cash"
              onValueChange={value => value && setCash(previous => ({
                ...previous,
                payer: value === 'partner' ? 'partner' : 'me',
              }))}
              type="single"
              value={cash.payer}
              variant="outline"
            >
              <ToggleGroupItem value="me">I add</ToggleGroupItem>

              <ToggleGroupItem value="partner">
                {partner}

                {' '}
                adds
              </ToggleGroupItem>
            </ToggleGroup>

            <Input
              aria-label="Cash amount"
              className="w-28"
              min={0}
              onChange={event => setCash(previous => ({
                ...previous,
                amount: Math.max(0, Number(event.target.value) || 0),
              }))}
              step="0.5"
              type="number"
              value={cash.amount || ''}
              placeholder="0.00"
            />

            <Button
              onClick={balance}
              size="sm"
              type="button"
              variant="outline"
            >
              Balance
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-4 text-sm md:text-right">
          <div>
            <dt className="text-muted-foreground">Your total</dt>

            <dd className="text-lg font-bold tabular-nums">{formatPrice(myTotal, source)}</dd>
          </div>

          <div>
            <dt className="text-muted-foreground">Their total</dt>

            <dd className="text-lg font-bold tabular-nums">{formatPrice(theirTotal, source)}</dd>
          </div>

          <div>
            <dt className="text-muted-foreground">Difference</dt>

            <dd className={cn('text-lg font-bold tabular-nums', Math.abs(difference) < 0.5 ? 'text-want' : 'text-have')}>
              {difference > 0 ? '+' : ''}

              {formatPrice(difference, source)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
            <MapPin className="size-4" />
            Meet at
          </legend>

          {storeOptions.map(store => (
            <label
              className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm', meetup.kind === 'store' && meetup.storeSlug === store.slug && 'border-primary bg-primary/5')}
              key={store.slug}
            >
              <input
                checked={meetup.kind === 'store' && meetup.storeSlug === store.slug}
                className="mt-1 accent-primary"
                name="meetup"
                onChange={() => setMeetup({
                  kind: 'store',
                  storeSlug: store.slug,
                })}
                type="radio"
              />

              <span>
                <span className="font-semibold">{store.name}</span>

                <span className="block text-xs text-muted-foreground">{store.address}</span>
              </span>
            </label>
          ))}

          {storeOptions.length === 0 && <p className="text-xs text-muted-foreground">You don't share a store with {partner} yet — suggest a place.</p>}

          <label className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm', meetup.kind === 'custom' && 'border-primary bg-primary/5')}>
            <input
              checked={meetup.kind === 'custom'}
              className="mt-1 accent-primary"
              name="meetup"
              onChange={() => setMeetup({
                address: '',
                kind: 'custom',
                name: context.meetingPlaces[0] ?? '',
              })}
              type="radio"
            />

            <span className="flex-1 space-y-2">
              <span className="font-semibold">Somewhere else</span>

              {meetup.kind === 'custom' && (
                <>
                  <Input
                    aria-label="Place name"
                    onChange={event => setMeetup({
                      ...meetup,
                      name: event.target.value,
                    })}
                    placeholder="Place name"
                    value={meetup.name}
                  />

                  <Input
                    aria-label="Address"
                    onChange={event => setMeetup({
                      ...meetup,
                      address: event.target.value,
                    })}
                    placeholder="Address (optional)"
                    value={meetup.address}
                  />

                  <span className="flex flex-wrap gap-1">
                    {context.meetingPlaces.map(place => (
                      <Button
                        key={place}
                        onClick={() => setMeetup({
                          ...meetup,
                          name: place,
                        })}
                        size="xs"
                        type="button"
                        variant="secondary"
                      >
                        {place}
                      </Button>
                    ))}
                  </span>
                </>
              )}
            </span>
          </label>
        </fieldset>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trade-meet-at">Date and time</Label>

            <Input
              id="trade-meet-at"
              onChange={event => setMeetAt(event.target.value)}
              type="datetime-local"
              value={meetAt}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trade-note">Note (optional)</Label>

            <Textarea
              id="trade-note"
              maxLength={500}
              onChange={event => setNote(event.target.value)}
              placeholder="Anything they should know?"
              rows={4}
              value={note}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          onClick={onClose}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>

        <Button
          disabled={empty || propose.isPending}
          onClick={submit}
          type="button"
        >
          {propose.isPending ? <Loader2 className="animate-spin" /> : <ArrowLeftRight />}

          {request.trade ? 'Send updated proposal' : 'Send proposal'}
        </Button>
      </DialogFooter>
    </>
  )
}

function TradeSide({ available, emptyHint, matchedLabel, onChange, selection, title, total }: {
  title: string;
  available: PickableItem[];
  selection: Map<string, Selection>;
  onChange: (next: Map<string, Selection>) => void;
  total: number;
  emptyHint: string;
  matchedLabel: string
}) {
  const [query, setQuery] = useState('')
  const selected = available.filter(item => selection.has(item.id))
  const candidates = available
    .filter(item => !selection.has(item.id) && item.card.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(b.matched) - Number(a.matched))
    .slice(0, 30)

  const update = (itemId: string, patch: Partial<Selection>) => {
    const next = new Map(selection)
    const current = next.get(itemId)
    if (current) next.set(itemId, {
      ...current,
      ...patch,
    })
    onChange(next)
  }
  const add = (item: PickableItem) => {
    const next = new Map(selection)
    next.set(item.id, {
      price: item.price,
      quantity: 1,
    })
    onChange(next)
  }
  const remove = (itemId: string) => {
    const next = new Map(selection)
    next.delete(itemId)
    onChange(next)
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border p-3">
      <header className="flex items-center justify-between">
        <h3 className="font-bold">{title}</h3>

        <Price amount={total} />
      </header>

      {selected.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{emptyHint}</p>}

      <ul className="space-y-2">
        {selected.map((item) => {
          const line = selection.get(item.id)
          if (!line) return null
          return (
            <li
              className="flex items-center gap-2 rounded-lg bg-muted/40 p-2"
              key={item.id}
            >
              <CardArt
                card={item.card}
                className="w-9 shrink-0"
                finish={item.finish}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.card.name}</p>

                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ConditionBadge condition={item.condition} />

                  <span className="uppercase">{item.language}</span>

                  <FinishBadge finish={item.finish} />
                </p>
              </div>

              <QuantityStepper
                max={item.quantity}
                onChange={quantity => update(item.id, { quantity })}
                value={line.quantity}
              />

              <Input
                aria-label={`Unit value of ${item.card.name}`}
                className="h-7 w-20 px-2 text-right text-xs"
                min={0}
                onChange={event => update(item.id, { price: Math.max(0, Number(event.target.value) || 0) })}
                step="0.01"
                type="number"
                value={line.price}
              />

              <Button
                aria-label={`Remove ${item.card.name}`}
                onClick={() => remove(item.id)}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </li>
          )
        })}
      </ul>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          aria-label={`Search cards for "${title}"`}
          className="pl-9"
          onChange={event => setQuery(event.target.value)}
          placeholder="Search to add cards"
          value={query}
        />
      </div>

      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {candidates.map(item => (
          <li key={item.id}>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => add(item)}
              type="button"
            >
              <span className="min-w-0 flex-1 truncate">{item.card.name}</span>

              {item.matched && (
                <span className="flex items-center gap-1 rounded-full bg-match/15 px-2 text-[11px] font-semibold text-match">
                  <Sparkles className="size-3" />

                  {matchedLabel}
                </span>
              )}

              {item.note && <span className="text-[11px] text-muted-foreground">{item.note}</span>}

              <span className="text-xs text-muted-foreground uppercase">{item.condition}</span>

              <Price
                amount={item.price}
                className="text-xs"
              />
            </button>
          </li>
        ))}

        {candidates.length === 0 && <li className="px-2 py-1.5 text-xs text-muted-foreground">No more cards to add.</li>}
      </ul>
    </section>
  )
}
