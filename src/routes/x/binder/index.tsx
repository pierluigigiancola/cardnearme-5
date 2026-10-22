import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { FileUp, Filter, Plus, Settings2, Share2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { AddCardDialog, isBinderSection, sectionLabels } from '#/components/binder/AddCardDialog'
import { BinderItems, BulkActions } from '#/components/binder/BinderItems'
import { ListFormDialog } from '#/components/binder/ListFormDialog'
import { BrowseToolbar, FacetSidebar } from '#/components/browse/BrowseControls'
import { Price } from '#/components/cards/CardBits'
import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { pickSort, validateBrowseSearch } from '#/lib/browseSearch'
import type { BrowseSearch } from '#/lib/browseSearch'
import { formatNumber } from '#/lib/format'
import { cn } from '#/lib/utils'
import { binderCountsQuery, binderItemsQuery, tradeListsQuery } from '#/services/queries'
import type { BinderQuery, BinderSection } from '#/services/types'

interface BinderSearch extends BrowseSearch {
  section?: BinderSection
  list?: string
}

const sortOptions = [
  {
    label: 'Recently changed',
    value: 'updated',
  },
  {
    label: 'Name',
    value: 'name',
  },
  {
    label: 'Price',
    value: 'price',
  },
  {
    label: 'Copies',
    value: 'quantity',
  },
]

function toBinderQuery(search: BinderSearch): BinderQuery {
  return {
    facets: search.f,
    listId: search.section === 'collection' ? undefined : search.list,
    order: search.order ?? 'desc',
    q: search.q,
    section: search.section ?? 'haves',
    sort: pickSort(search.sort, ['updated', 'name', 'price', 'quantity'] as const, 'updated'),
  }
}

export const Route = createFileRoute('/x/binder/')({
  validateSearch: (search: Record<string, unknown>): BinderSearch => ({
    ...validateBrowseSearch(search),
    list: typeof search.list === 'string' ? search.list : undefined,
    section: isBinderSection(search.section) ? search.section : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient, user }, deps }) => {
    await Promise.all([
      queryClient.ensureQueryData(binderCountsQuery(user.id)),
      queryClient.ensureQueryData(binderItemsQuery(user.id, toBinderQuery(deps))),
      queryClient.ensureQueryData(tradeListsQuery(user.id)),
    ])
  },
  head: () => ({ meta: [{ title: 'Binder | CardNearMe' }] }),
  component: BinderPage,
})

function BinderPage() {
  const { user } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = toBinderQuery(search)
  const { section } = query
  const { data: counts } = useSuspenseQuery(binderCountsQuery(user.id))
  const { data: page } = useSuspenseQuery(binderItemsQuery(user.id, query))
  const { data: allLists } = useSuspenseQuery(tradeListsQuery(user.id))
  const sectionLists = allLists.filter(list => list.type === section)
  const [adding, setAdding] = useState(false)
  const [creatingList, setCreatingList] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const onChange = useCallback(
    (update: (previous: BrowseSearch) => BrowseSearch) => void navigate({
      replace: true,
      search: update,
    }),
    [navigate],
  )
  const toggle = (itemId: string) => setSelected((previous) => {
    const next = new Set(previous)
    if (next.has(itemId)) next.delete(itemId)
    else next.add(itemId)
    return next
  })
  const share = () => {
    void navigator.clipboard.writeText(`${window.location.origin}/users/${user.username}`)
    toast.success(`Link to your public ${sectionLabels[section].toLowerCase()} copied`)
  }

  const filters = (
    <FacetSidebar
      facets={page.facets}
      onChange={onChange}
      search={search}
    />
  )

  return (
    <div className="page-wrap pb-12">
      <PageHeader
        actions={(
          <>
            {section !== 'collection' && (
              <Button
                onClick={share}
                variant="ghost"
              >
                <Share2 />

                {`Share ${sectionLabels[section]}`}
              </Button>
            )}

            <Button
              asChild
              variant="outline"
            >
              <Link
                search={{
                  list: query.listId,
                  section,
                }}
                to="/x/binder/import"
              >
                <FileUp />
                Import
              </Link>
            </Button>

            <Button onClick={() => setAdding(true)}>
              <Plus />

              {`Add to ${sectionLabels[section]}`}
            </Button>
          </>
        )}
        description="Your collection and the haves and wants other traders match against."
        title="Binder"
      />

      <nav
        aria-label="Binder sections"
        className="flex gap-1 border-b"
      >
        {(['haves', 'wants', 'collection'] as const).map(option => (
          <Link
            className={cn('-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition', option === section ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
            key={option}
            onClick={() => setSelected(new Set())}
            search={{ section: option }}
            to="/x/binder"
          >
            {sectionLabels[option]}

            <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{`(${formatNumber(counts[option])})`}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Market value">
          <Price
            amount={page.stats.marketValue}
            className="text-2xl"
          />
        </Stat>

        <Stat label="Cards">{formatNumber(page.stats.cards)}</Stat>

        <Stat label="Distinct printings">{formatNumber(page.stats.distinct)}</Stat>
      </div>

      {section !== 'collection' && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ListChip
            active={!query.listId}
            label={`All ${sectionLabels[section]}`}
            section={section}
          />

          {sectionLists.map(list => (
            <ListChip
              active={query.listId === list.id}
              count={list.cardCount}
              key={list.id}
              label={list.name}
              listId={list.id}
              section={section}
            />
          ))}

          <Button
            className="rounded-full"
            onClick={() => setCreatingList(true)}
            size="sm"
            variant="outline"
          >
            <Plus />
            New list
          </Button>

          <Button
            asChild
            className="rounded-full"
            size="sm"
            variant="ghost"
          >
            <Link to="/x/lists">
              <Settings2 />
              Manage lists
            </Link>
          </Button>
        </div>
      )}

      <div className={cn('mt-6 grid gap-6', section === 'collection' && 'lg:grid-cols-[240px_1fr]')}>
        {section === 'collection' && <div className="hidden lg:block">{filters}</div>}

        <div className="min-w-0 space-y-4">
          <div className="flex items-start gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  className={cn(section === 'collection' && 'lg:hidden')}
                  variant="outline"
                >
                  <Filter />
                  Filters
                </Button>
              </SheetTrigger>

              <SheetContent
                className="overflow-y-auto"
                side="left"
              >
                <SheetHeader>
                  <SheetTitle>Filter your binder</SheetTitle>
                </SheetHeader>

                <div className="px-4 pb-6">{filters}</div>
              </SheetContent>
            </Sheet>

            <div className="flex-1">
              <BrowseToolbar
                onChange={onChange}
                placeholder={`Search your ${sectionLabels[section].toLowerCase()}`}
                search={search}
                shown={page.items.length}
                sort={query.sort ?? 'updated'}
                sortOptions={sortOptions}
                total={page.stats.distinct}
              />
            </div>
          </div>

          {page.items.length === 0
            ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
                <p className="font-semibold">{search.q || search.f ? 'No cards match these filters' : `No cards in your ${sectionLabels[section].toLowerCase()} yet`}</p>

                <p className="max-w-sm text-sm text-muted-foreground">
                  {section === 'wants'
                    ? 'Add the cards you are looking for and we will match them with traders at your stores.'
                    : 'Add cards one by one or import a list from another tool.'}
                </p>

                <Button onClick={() => setAdding(true)}>
                  <Plus />
                  Add a card
                </Button>
              </div>
            )
            : (
              <BinderItems
                items={page.items}
                lists={allLists}
                onToggle={toggle}
                selected={selected}
                view={search.view ?? 'visual'}
              />
            )}

          <BulkActions
            lists={allLists}
            onClear={() => setSelected(new Set())}
            selected={selected}
          />
        </div>
      </div>

      <AddCardDialog
        defaultListId={query.listId}
        defaultSection={section}
        onOpenChange={setAdding}
        open={adding}
      />

      <ListFormDialog
        defaultType={section === 'wants' ? 'wants' : 'haves'}
        onCreated={list => void navigate({
          search: {
            list: list.id,
            section: list.type,
          },
        })}
        onOpenChange={setCreatingList}
        open={creatingList}
      />
    </div>
  )
}

function Stat({ children, label }: {
  label: string;
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>

      <p className="mt-1 text-2xl font-bold tabular-nums">{children}</p>
    </div>
  )
}

function ListChip({ active, count, label, listId, section }: {
  label: string;
  section: BinderSection;
  listId?: string;
  count?: number;
  active: boolean
}) {
  return (
    <Link
      className={cn('rounded-full border px-3 py-1 text-sm font-medium transition', active ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}
      search={{
        list: listId,
        section,
      }}
      to="/x/binder"
    >
      {label}

      {count !== undefined && <span className="ml-1.5 text-xs tabular-nums opacity-70">{count}</span>}
    </Link>
  )
}
