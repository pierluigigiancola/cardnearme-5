import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

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
import { useWorkspaceMutation } from '#/services/mutations'
import { gamesQuery } from '#/services/queries'
import type { GameId, TradeList, TradeListInput, TradeListType } from '#/services/types'

/** Create a trade list, or edit one when `list` is given. */
export function ListFormDialog({ defaultType = 'haves', list, onCreated, onOpenChange, open }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list?: TradeList;
  defaultType?: TradeListType;
  onCreated?: (list: TradeList) => void
}) {
  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        {open && (
          <ListForm
            defaultType={defaultType}
            list={list}
            onCreated={onCreated}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ListForm({ defaultType, list, onCreated, onDone }: {
  list?: TradeList;
  defaultType: TradeListType;
  onCreated?: (list: TradeList) => void;
  onDone: () => void
}) {
  const { data: games } = useSuspenseQuery(gamesQuery())
  const [input, setInput] = useState<TradeListInput>({
    gameId: list?.gameId ?? null,
    name: list?.name ?? '',
    type: list?.type ?? defaultType,
    visibility: list?.visibility ?? 'public',
  })
  const save = useWorkspaceMutation((services, next: TradeListInput) =>
    (list ? services.lists.update(list.id, next) : services.lists.create(next)))

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate(input, {
          onSuccess: (saved) => {
            toast.success(list ? 'List updated' : `Created ${saved.name}`)
            if (!list) onCreated?.(saved)
            onDone()
          },
        })
      }}
    >
      <DialogHeader>
        <DialogTitle>{list ? 'Edit list' : 'New list'}</DialogTitle>

        <DialogDescription>Lists group your haves or wants, e.g. “Commander upgrades” or “Bulk rares”.</DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="list-name">Name</Label>

        <Input
          autoFocus
          id="list-name"
          maxLength={60}
          onChange={event => setInput({
            ...input,
            name: event.target.value,
          })}
          required
          value={input.name}
        />
      </div>

      {!list && (
        <div className="space-y-1.5">
          <Label>Type</Label>

          <ToggleGroup
            aria-label="List type"
            className="w-full"
            onValueChange={value => value && setInput({
              ...input,
              type: value === 'wants' ? 'wants' : 'haves',
            })}
            type="single"
            value={input.type}
            variant="outline"
          >
            <ToggleGroupItem
              className="flex-1"
              value="haves"
            >
              Haves
            </ToggleGroupItem>

            <ToggleGroupItem
              className="flex-1"
              value="wants"
            >
              Wants
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Game</Label>

          <Select
            disabled={list?.isDefault}
            onValueChange={value => setInput({
              ...input,
              gameId: games.find(game => game.id === value)?.id ?? null,
            })}
            value={input.gameId ?? 'any'}
          >
            <SelectTrigger
              aria-label="Game"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="any">Any game</SelectItem>

              {games.map(game => (
                <SelectItem
                  key={game.id}
                  value={game.id satisfies GameId}
                >
                  {game.shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Visibility</Label>

          <Select
            onValueChange={value => setInput({
              ...input,
              visibility: value === 'private' ? 'private' : 'public',
            })}
            value={input.visibility}
          >
            <SelectTrigger
              aria-label="Visibility"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="public">Public</SelectItem>

              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button
          onClick={onDone}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>

        <Button
          disabled={save.isPending || !input.name.trim()}
          type="submit"
        >
          {list ? 'Save' : 'Create list'}
        </Button>
      </DialogFooter>
    </form>
  )
}
