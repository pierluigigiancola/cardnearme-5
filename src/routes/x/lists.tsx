import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Eye, EyeOff, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ListFormDialog } from '#/components/binder/ListFormDialog'
import { GameBadge } from '#/components/cards/CardBits'
import { PageHeader } from '#/components/layout/PageHeader'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
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
import { formatRelative } from '#/lib/format'
import { useWorkspaceMutation } from '#/services/mutations'
import { gamesQuery, tradeListsQuery } from '#/services/queries'
import type { ListsQuery, SortOrder, TradeList } from '#/services/types'

interface ListsSearch {
  q?: string
  sort?: NonNullable<ListsQuery['sort']>
  order?: SortOrder
}

export const Route = createFileRoute('/x/lists')({
  validateSearch: (search: Record<string, unknown>): ListsSearch => ({
    order: search.order === 'asc' || search.order === 'desc' ? search.order : undefined,
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    sort: search.sort === 'name' || search.sort === 'created' || search.sort === 'updated' ? search.sort : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient, user }, deps }) => {
    await queryClient.ensureQueryData(tradeListsQuery(user.id, deps))
  },
  head: () => ({ meta: [{ title: 'Lists | CardNearMe' }] }),
  component: ListsPage,
})

function ListsPage() {
  const { user } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: lists } = useSuspenseQuery(tradeListsQuery(user.id, search))
  const { data: games } = useSuspenseQuery(gamesQuery())
  const [query, setQuery] = useState(search.q ?? '')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<TradeList | null>(null)
  const [deleting, setDeleting] = useState<TradeList | null>(null)
  const order = search.order ?? 'desc'

  useEffect(() => {
    if (query === (search.q ?? '')) return
    const timeout = setTimeout(() => void navigate({
      replace: true,
      search: previous => ({
        ...previous,
        q: query || undefined,
      }),
    }), 250)
    return () => clearTimeout(timeout)
  }, [navigate, query, search.q])

  const update = useWorkspaceMutation((services, input: {
    list: TradeList;
    visibility: TradeList['visibility']
  }) => services.lists.update(input.list.id, { visibility: input.visibility }))
  const remove = useWorkspaceMutation((services, list: TradeList) => services.lists.remove(list.id))

  return (
    <div className="page-wrap pb-12">
      <PageHeader
        actions={(
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Add list
          </Button>
        )}
        description="Group your haves and wants into lists and choose which ones other traders see."
        title="Lists"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            aria-label="Search lists"
            className="pl-9"
            onChange={event => setQuery(event.target.value)}
            placeholder="Search lists"
            value={query}
          />
        </div>

        <Select
          onValueChange={value => void navigate({
            replace: true,
            search: previous => ({
              ...previous,
              sort: value === 'name' || value === 'created' ? value : 'updated',
            }),
          })}
          value={search.sort ?? 'updated'}
        >
          <SelectTrigger
            aria-label="Sort by"
            className="w-44"
          >
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="updated">Last updated</SelectItem>

            <SelectItem value="created">Date created</SelectItem>

            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>

        <Button
          aria-label={order === 'asc' ? 'Ascending' : 'Descending'}
          onClick={() => void navigate({
            replace: true,
            search: previous => ({
              ...previous,
              order: order === 'asc' ? 'desc' : 'asc',
            }),
          })}
          size="icon"
          variant="outline"
        >
          {order === 'asc' ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>List</TableHead>

              <TableHead>Type</TableHead>

              <TableHead>Game</TableHead>

              <TableHead className="text-right">Cards</TableHead>

              <TableHead>Visibility</TableHead>

              <TableHead>Updated</TableHead>

              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {lists.map((list) => {
              const game = games.find(candidate => candidate.id === list.gameId)
              return (
                <TableRow key={list.id}>
                  <TableCell className="font-semibold">
                    <Link
                      className="hover:underline"
                      search={{
                        list: list.id,
                        section: list.type,
                      }}
                      to="/x/binder"
                    >
                      {list.name}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Badge className={list.type === 'haves' ? 'bg-have/15 text-have' : 'bg-want/15 text-want'}>{list.type === 'haves' ? 'Haves' : 'Wants'}</Badge>
                  </TableCell>

                  <TableCell>{game ? <GameBadge game={game} /> : <span className="text-muted-foreground">Any</span>}</TableCell>

                  <TableCell className="text-right tabular-nums">{list.cardCount}</TableCell>

                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      {list.visibility === 'public' ? <Eye className="size-4" /> : <EyeOff className="size-4" />}

                      {list.visibility === 'public' ? 'Public' : 'Private'}
                    </span>
                  </TableCell>

                  <TableCell className="text-muted-foreground">{formatRelative(list.updatedAt)}</TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={`Actions for ${list.name}`}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(list)}>
                          <Pencil />
                          Rename / edit
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => update.mutate({
                            list,
                            visibility: list.visibility === 'public' ? 'private' : 'public',
                          }, { onSuccess: saved => toast.success(`${saved.name} is now ${saved.visibility}`) })}
                        >
                          {list.visibility === 'public' ? <EyeOff /> : <Eye />}

                          {list.visibility === 'public' ? 'Make private' : 'Make public'}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onSelect={() => setDeleting(list)}
                          variant="destructive"
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}

            {lists.length === 0 && (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground"
                  colSpan={7}
                >
                  {search.q ? 'No lists match your search.' : 'No lists yet — add one to start organising your haves and wants.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ListFormDialog
        onOpenChange={setCreating}
        open={creating}
      />

      <ListFormDialog
        list={editing ?? undefined}
        onOpenChange={open => !open && setEditing(null)}
        open={editing !== null}
      />

      <Dialog
        onOpenChange={open => !open && setDeleting(null)}
        open={deleting !== null}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{`Delete ${deleting?.name ?? 'list'}?`}</DialogTitle>

            <DialogDescription>{`The list and its ${deleting?.cardCount ?? 0} cards are removed from your binder. This cannot be undone.`}</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              onClick={() => setDeleting(null)}
              variant="ghost"
            >
              Cancel
            </Button>

            <Button
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting, {
                onSuccess: () => {
                  toast.success(`Deleted ${deleting.name}`)
                  setDeleting(null)
                },
              })}
              variant="destructive"
            >
              Delete list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
