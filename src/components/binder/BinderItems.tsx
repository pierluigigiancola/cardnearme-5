import { Link } from '@tanstack/react-router'
import { ArrowLeftRight, FolderInput, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { sectionLabels } from './AddCardDialog'

import { CardArt } from '#/components/cards/CardArt'
import { ConditionBadge, FinishBadge, Price } from '#/components/cards/CardBits'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { ConfirmDialog } from '#/components/workspace/ConfirmDialog'
import { QuantityStepper } from '#/components/workspace/QuantityStepper'
import { conditionLabels, conditions, finishLabels, isCondition, isFinish, isLanguage, languageLabels, languages } from '#/lib/cardOptions'
import { formatRelative } from '#/lib/format'
import { cn } from '#/lib/utils'
import { useWorkspaceMutation } from '#/services/mutations'
import type { BinderItem, BinderItemKind, BinderItemPatch, CollectionEntry, TradeList, ViewMode } from '#/services/types'

export interface MoveTarget {
  /** A Haves or Wants List, or null to take Collection entries off trade. */
  listId: string | null
  label: string
  /** The entry kind the target accepts: Haves Lists and "Not for trade" take Collection entries, Wants Lists take Wants. */
  accepts: BinderItemKind
}

/** Where entries can be moved: off trade, or onto any List. */
export function moveTargets(lists: TradeList[]): MoveTarget[] {
  return [
    {
      accepts: 'collection',
      label: 'Not for trade',
      listId: null,
    },
    ...lists.map((list): MoveTarget => ({
      accepts: list.type === 'haves' ? 'collection' : 'want',
      label: `${sectionLabels[list.type]} · ${list.name}`,
      listId: list.id,
    })),
  ]
}

/**
 * Where these items can all go: Lists of the other kind or for another game are left out, and so is
 * the place every item already is. Used by the single-item menu and the bulk bar, so neither offers
 * a move that fails.
 */
export function moveTargetsFor(items: BinderItem[], lists: TradeList[]): MoveTarget[] {
  const gameOf = new Map(lists.map(list => [list.id, list.gameId]))
  return moveTargets(lists).filter((target) => {
    if (!items.every(item => item.kind === target.accepts)) return false
    if (items.every(item => item.listId === target.listId)) return false
    const gameId = target.listId ? gameOf.get(target.listId) : null
    return !gameId || items.every(item => item.card.gameId === gameId)
  })
}

/** Owned and for-trade copies of a Collection entry, edited together on its row. */
function CollectionQuantities({ entry }: { entry: CollectionEntry }) {
  const update = useWorkspaceMutation((services, patch: BinderItemPatch) => services.binder.updateItem(entry.id, patch))

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <QuantityStepper
        label={`Copies of ${entry.card.name} owned`}
        onChange={quantity => update.mutate({ quantity })}
        value={entry.quantity}
      />

      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        For trade

        <QuantityStepper
          label={`Copies of ${entry.card.name} for trade`}
          max={entry.quantity}
          min={0}
          onChange={forTradeQuantity => update.mutate({ forTradeQuantity }, { onSuccess: () => toast.success(forTradeQuantity > 0 ? `${entry.card.name} is on your Haves` : `${entry.card.name} is no longer for trade`) })}
          value={entry.forTradeQuantity}
        />
      </span>
    </div>
  )
}

export function BinderItems({ items, lists, onToggle, selected, view }: {
  items: BinderItem[];
  lists: TradeList[];
  view: ViewMode;
  selected: ReadonlyMap<string, BinderItem>;
  onToggle: (item: BinderItem) => void
}) {
  const [editing, setEditing] = useState<BinderItem | null>(null)
  const [removing, setRemoving] = useState<BinderItem | null>(null)
  const listNames = new Map(lists.map(list => [list.id, list.name]))

  return (
    <>
      {view === 'table'
        ? (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />

                  <TableHead>Card</TableHead>

                  <TableHead>Set</TableHead>

                  <TableHead>List</TableHead>

                  <TableHead>Cond.</TableHead>

                  <TableHead>Lang.</TableHead>

                  <TableHead className="text-right">Qty</TableHead>

                  <TableHead className="text-right">Price</TableHead>

                  <TableHead>Updated</TableHead>

                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.map(item => (
                  <TableRow
                    data-state={selected.has(item.id) ? 'selected' : undefined}
                    key={item.id}
                  >
                    <TableCell>
                      <Checkbox
                        aria-label={`Select ${item.card.name}`}
                        checked={selected.has(item.id)}
                        onCheckedChange={() => onToggle(item)}
                      />
                    </TableCell>

                    <TableCell className="font-medium">
                      <CardLink item={item}>{item.card.name}</CardLink>

                      {' '}

                      <FinishBadge finish={item.finish} />

                      {item.inTrade && <InTradeBadge className="ml-1" />}
                    </TableCell>

                    <TableCell className="text-muted-foreground">{item.card.setName}</TableCell>

                    <TableCell className="text-muted-foreground">{item.listId ? listNames.get(item.listId) : '—'}</TableCell>

                    <TableCell>
                      <ConditionBadge condition={item.condition} />
                    </TableCell>

                    <TableCell className="uppercase">{item.language}</TableCell>

                    <TableCell className="text-right tabular-nums">{item.kind === 'collection' ? <CollectionQuantities entry={item} /> : item.quantity}</TableCell>

                    <TableCell className="text-right">
                      <Price amount={item.price} />
                    </TableCell>

                    <TableCell className="text-muted-foreground">{formatRelative(item.updatedAt)}</TableCell>

                    <TableCell>
                      <ItemActions
                        item={item}
                        lists={lists}
                        onEdit={() => setEditing(item)}
                        onRemove={() => setRemoving(item)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
        : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {items.map(item => (
              <li
                className={cn('group relative flex flex-col gap-2 rounded-xl border bg-card p-2 transition', selected.has(item.id) && 'border-primary ring-2 ring-primary/40')}
                key={item.id}
              >
                <div className="relative">
                  <CardLink item={item}>
                    <CardArt
                      card={item.card}
                      finish={item.finish}
                    />
                  </CardLink>

                  <Checkbox
                    aria-label={`Select ${item.card.name}`}
                    checked={selected.has(item.id)}
                    className={cn('absolute top-2 left-2 size-5 bg-background/90 shadow transition', selected.size === 0 && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
                    onCheckedChange={() => onToggle(item)}
                  />

                  {item.quantity > 1 && <span className="absolute top-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-bold shadow">{`×${item.quantity}`}</span>}

                  <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                    {item.listId && <Badge className="bg-background/90 text-[10px] text-foreground shadow">{listNames.get(item.listId)}</Badge>}

                    {item.kind === 'collection' && item.forTradeQuantity > 0 && <Badge className="bg-have/90 text-[10px] text-background shadow">{`${item.forTradeQuantity} for trade`}</Badge>}

                    {item.inTrade && <InTradeBadge />}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <ConditionBadge condition={item.condition} />

                  <span className="text-xs text-muted-foreground uppercase">{item.language}</span>

                  <FinishBadge finish={item.finish} />

                  <Price
                    amount={item.price}
                    className="ml-auto text-sm"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{item.card.name}</p>

                  <ItemActions
                    item={item}
                    lists={lists}
                    onEdit={() => setEditing(item)}
                    onRemove={() => setRemoving(item)}
                  />
                </div>

                {item.kind === 'collection' && <CollectionQuantities entry={item} />}
              </li>
            ))}
          </ul>
        )}

      <EditItemDialog
        item={editing}
        lists={lists}
        onClose={() => setEditing(null)}
      />

      <RemoveItemDialog
        item={removing}
        onClose={() => setRemoving(null)}
      />
    </>
  )
}

function InTradeBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn('bg-match text-[10px] text-background shadow', className)}>
      <ArrowLeftRight />
      In trade
    </Badge>
  )
}

function CardLink({ children, item }: {
  item: BinderItem;
  children: React.ReactNode
}) {
  return (
    <Link
      params={{
        card: item.card.slug,
        game: item.card.gameId,
        number: item.card.number,
        set: item.card.setCode,
      }}
      to="/sets/$game/$set/$card/$number"
    >
      {children}
    </Link>
  )
}

function ItemActions({ item, lists, onEdit, onRemove }: {
  item: BinderItem;
  lists: TradeList[];
  onEdit: () => void;
  onRemove: () => void
}) {
  const move = useWorkspaceMutation((services, target: MoveTarget) => services.binder.moveItems([item.id], { listId: target.listId }))
  const targets = moveTargetsFor([item], lists)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Actions for ${item.card.name}`}
          size="icon-xs"
          variant="ghost"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-60"
      >
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          Edit details
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground">Move to</DropdownMenuLabel>

        {targets.map(target => (
          <DropdownMenuItem
            key={`${target.accepts}-${target.listId ?? ''}`}
            onSelect={() => move.mutate(target, { onSuccess: () => toast.success(`Moved ${item.card.name} to ${target.label}`) })}
          >
            <FolderInput />

            {target.label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={onRemove}
          variant="destructive"
        >
          <Trash2 />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RemoveItemDialog({ item, onClose }: {
  item: BinderItem | null;
  onClose: () => void
}) {
  const remove = useWorkspaceMutation((services, itemId: string) => services.binder.removeItems([itemId]))
  // Keep the last card's name on screen while the dialog animates closed.
  const [shown, setShown] = useState(item)
  if (item && item !== shown) setShown(item)

  return (
    <ConfirmDialog
      confirmLabel="Remove"
      description={`${shown && shown.quantity > 1 ? `All ${shown.quantity} copies are` : 'It is'} removed from your binder. This cannot be undone.`}
      onConfirm={() => item && remove.mutate(item.id, {
        onSuccess: () => {
          toast.success(`Removed ${item.card.name}`)
          onClose()
        },
      })}
      onOpenChange={open => !open && onClose()}
      open={item !== null}
      pending={remove.isPending}
      title={`Remove ${shown?.card.name ?? 'card'}?`}
    />
  )
}

function EditItemDialog({ item, lists, onClose }: {
  item: BinderItem | null;
  lists: TradeList[];
  onClose: () => void
}) {
  return (
    <Dialog
      onOpenChange={open => !open && onClose()}
      open={item !== null}
    >
      <DialogContent className="sm:max-w-md">
        {item && (
          <EditItemForm
            item={item}
            key={item.id}
            lists={lists}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditItemForm({ item, lists, onClose }: {
  item: BinderItem;
  lists: TradeList[];
  onClose: () => void
}) {
  const owned = item.kind === 'collection'
  const [patch, setPatch] = useState<Required<Omit<BinderItemPatch, 'listId'>> & { listId: string | null }>({
    condition: item.condition,
    finish: item.finish,
    forTradeQuantity: item.kind === 'collection' ? item.forTradeQuantity : 0,
    language: item.language,
    listId: item.listId,
    quantity: item.quantity,
  })
  const update = useWorkspaceMutation((services, next: BinderItemPatch) => services.binder.updateItem(item.id, next))
  const listType = owned ? 'haves' : 'wants'
  const sameTypeLists = lists.filter(list => list.type === listType && (!list.gameId || list.gameId === item.card.gameId))
  // A Collection entry sits on a Haves List only while copies are for trade.
  const showList = sameTypeLists.length > 0 && (!owned || patch.forTradeQuantity > 0)
  const { forTradeQuantity, ...shared } = patch
  const submitted: BinderItemPatch = owned
    ? {
      ...shared,
      forTradeQuantity: Math.min(forTradeQuantity, patch.quantity),
      listId: forTradeQuantity > 0 ? patch.listId ?? sameTypeLists.at(0)?.id ?? null : null,
    }
    : shared

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item.card.name}</DialogTitle>

        <DialogDescription>{`${item.card.setName} · #${item.card.number} · ${owned ? 'Collection' : 'Wants'}`}</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{owned ? 'Condition' : 'Minimum condition'}</Label>

          <Select
            onValueChange={value => isCondition(value) && setPatch({
              ...patch,
              condition: value,
            })}
            value={patch.condition}
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
        </div>

        <div className="space-y-1.5">
          <Label>Language</Label>

          <Select
            onValueChange={value => isLanguage(value) && setPatch({
              ...patch,
              language: value,
            })}
            value={patch.language}
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
        </div>

        <div className="space-y-1.5">
          <Label>Finish</Label>

          <Select
            onValueChange={value => isFinish(value) && setPatch({
              ...patch,
              finish: value,
            })}
            value={patch.finish}
          >
            <SelectTrigger
              aria-label="Finish"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {item.card.finishes.map(option => (
                <SelectItem
                  key={option}
                  value={option}
                >
                  {finishLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{owned ? 'Copies owned' : 'Quantity'}</Label>

          <QuantityStepper
            className="h-9"
            onChange={quantity => setPatch({
              ...patch,
              quantity,
            })}
            value={patch.quantity}
          />
        </div>

        {owned && (
          <div className="space-y-1.5">
            <Label>For trade</Label>

            <QuantityStepper
              className="h-9"
              label="For trade"
              max={patch.quantity}
              min={0}
              onChange={next => setPatch({
                ...patch,
                forTradeQuantity: next,
              })}
              value={Math.min(patch.forTradeQuantity, patch.quantity)}
            />
          </div>
        )}

        {showList && (
          <div className="col-span-2 space-y-1.5">
            <Label>{owned ? 'Haves list' : 'List'}</Label>

            <Select
              onValueChange={listId => setPatch({
                ...patch,
                listId,
              })}
              value={patch.listId ?? sameTypeLists.at(0)?.id}
            >
              <SelectTrigger
                aria-label="List"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {sameTypeLists.map(list => (
                  <SelectItem
                    key={list.id}
                    value={list.id}
                  >
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          onClick={onClose}
          variant="ghost"
        >
          Cancel
        </Button>

        <Button
          disabled={update.isPending}
          onClick={() => update.mutate(submitted, {
            onSuccess: () => {
              toast.success('Card updated')
              onClose()
            },
          })}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  )
}

/** Sticky bar shown while cards are selected: move or delete them together. */
export function BulkActions({ lists, onClear, selected }: {
  selected: ReadonlyMap<string, BinderItem>;
  lists: TradeList[];
  onClear: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const move = useWorkspaceMutation((services, target: MoveTarget) => services.binder.moveItems([...selected.keys()], { listId: target.listId }))
  const remove = useWorkspaceMutation(services => services.binder.removeItems([...selected.keys()]))
  if (selected.size === 0) return null
  const targets = moveTargetsFor([...selected.values()], lists)

  return (
    <div className="sticky bottom-4 z-30 mx-auto mt-4 flex w-fit flex-wrap items-center gap-2 rounded-full border bg-popover px-4 py-2 shadow-xl">
      <span className="text-sm font-semibold">{`${selected.size} selected`}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
          >
            <FolderInput />
            Move to…
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="center"
          className="w-60"
        >
          {targets.length === 0 && <DropdownMenuItem disabled>No list fits every selected card</DropdownMenuItem>}

          {targets.map(target => (
            <DropdownMenuItem
              key={`${target.accepts}-${target.listId ?? ''}`}
              onSelect={() => move.mutate(target, {
                onSuccess: () => {
                  toast.success(`Moved ${selected.size} cards to ${target.label}`)
                  onClear()
                },
              })}
            >
              {target.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        onClick={() => setConfirming(true)}
        size="sm"
        variant="destructive"
      >
        <Trash2 />
        Delete
      </Button>

      <Button
        aria-label="Clear selection"
        onClick={onClear}
        size="icon-sm"
        variant="ghost"
      >
        <X />
      </Button>

      <ConfirmDialog
        confirmLabel="Delete"
        description="They are removed from your binder. This cannot be undone."
        onConfirm={() => remove.mutate(undefined, {
          onSuccess: () => {
            toast.success('Cards deleted')
            setConfirming(false)
            onClear()
          },
        })}
        onOpenChange={setConfirming}
        open={confirming}
        pending={remove.isPending}
        title={`Delete ${selected.size} cards?`}
      />
    </div>
  )
}
