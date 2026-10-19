import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ClipboardList, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { isBinderSection, sectionLabels } from '#/components/binder/AddCardDialog'
import { CardSearchBox } from '#/components/binder/CardSearchBox'
import { CardArt } from '#/components/cards/CardArt'
import { Price } from '#/components/cards/CardBits'
import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
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
import { Textarea } from '#/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { parseCsvList, parseTextList } from '#/lib/cardListText'
import type { ListParseError } from '#/lib/cardListText'
import { cn } from '#/lib/utils'
import { useWorkspaceMutation } from '#/services/mutations'
import { binderImportQuery, tradeListsQuery } from '#/services/queries'
import type { BinderImport, BinderImportInput, BinderSection, ParsedImportRow } from '#/services/types'

type Step = 'source' | 'preview' | 'done'

interface ImportSearch {
  section?: BinderSection
  list?: string
  step?: Step
  importId?: string
}

const steps: {
  id: Step;
  label: string
}[] = [
  {
    id: 'source',
    label: 'Upload or paste',
  },
  {
    id: 'preview',
    label: 'Check matches',
  },
  {
    id: 'done',
    label: 'Done',
  },
]

const textExample = `4 Lightning Bolt
1x Sol Ring (CMM) 400
2 Counterspell *F*`

const csvExample = `Name,Set,Number,Quantity,Foil,Condition,Language
Lightning Bolt,M10,146,4,,NM,en`

export const Route = createFileRoute('/x/binder/import')({
  validateSearch: (search: Record<string, unknown>): ImportSearch => ({
    importId: typeof search.importId === 'string' ? search.importId : undefined,
    list: typeof search.list === 'string' ? search.list : undefined,
    section: isBinderSection(search.section) ? search.section : undefined,
    step: search.step === 'preview' || search.step === 'done' ? search.step : undefined,
  }),
  loaderDeps: ({ search }) => ({ importId: search.importId }),
  loader: async ({ context: { queryClient, user }, deps }) => {
    await Promise.all([
      queryClient.ensureQueryData(tradeListsQuery(user.id)),
      deps.importId ? queryClient.ensureQueryData(binderImportQuery(user.id, deps.importId)) : null,
    ])
  },
  head: () => ({ meta: [{ title: 'Import cards | CardNearMe' }] }),
  component: ImportCardsPage,
})

function ImportCardsPage() {
  const search = Route.useSearch()
  const step: Step = search.importId ? search.step ?? 'preview' : 'source'

  return (
    <div className="page-wrap pb-12">
      <PageHeader
        crumbs={[{
          href: '/x/binder',
          label: 'Binder',
        }, { label: 'Import' }]}
        description="Bring your cards over from a CSV export or a pasted list."
        title="Import cards"
      />

      <ol className="mb-6 flex flex-wrap gap-2 text-sm">
        {steps.map((item, index) => (
          <li
            className={cn('flex items-center gap-2 rounded-full border px-3 py-1', item.id === step ? 'border-primary bg-primary/10 font-semibold text-primary' : 'text-muted-foreground')}
            key={item.id}
          >
            <span className="tabular-nums">{index + 1}</span>

            {item.label}
          </li>
        ))}
      </ol>

      {step === 'source' && <SourceStep />}

      {step !== 'source' && search.importId && (
        <ImportReview
          done={step === 'done'}
          importId={search.importId}
        />
      )}
    </div>
  )
}

function SourceStep() {
  const { user } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: lists } = useSuspenseQuery(tradeListsQuery(user.id))
  const [section, setSection] = useState<BinderSection>(search.section ?? 'collection')
  const [listId, setListId] = useState<string | undefined>(search.list)
  const [source, setSource] = useState<'text' | 'csv'>('text')
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<ListParseError[]>([])
  const sectionLists = lists.filter(list => list.type === section)
  const selectedList = sectionLists.find(list => list.id === listId) ?? sectionLists.at(0)

  const create = useWorkspaceMutation((services, input: BinderImportInput) => services.binder.createImport(input))

  const readFile = async (file: File) => {
    setSource('csv')
    setText(await file.text())
  }

  const submit = () => {
    const parsed = source === 'csv' ? parseCsvList(text) : parseTextList(text)
    setErrors(parsed.errors)
    if (parsed.rows.length === 0) {
      toast.error('No cards found in this list')
      return
    }
    const rows: ParsedImportRow[] = parsed.rows.map(row => ({
      condition: row.condition,
      finish: row.finish,
      language: row.language,
      line: row.line,
      name: row.name,
      number: row.number,
      quantity: row.quantity,
      raw: row.raw,
      setCode: row.setCode,
    }))
    create.mutate({
      listId: section === 'collection' ? null : selectedList?.id ?? null,
      rows,
      section,
      source,
    }, {
      onSuccess: draft => void navigate({
        search: {
          importId: draft.id,
          section,
          step: 'preview',
        },
      }),
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 rounded-2xl border bg-card p-5">
        <ToggleGroup
          aria-label="Source"
          onValueChange={value => value && setSource(value === 'csv' ? 'csv' : 'text')}
          type="single"
          value={source}
          variant="outline"
        >
          <ToggleGroupItem value="text">
            <ClipboardList />
            Paste a list
          </ToggleGroupItem>

          <ToggleGroupItem value="csv">
            <FileSpreadsheet />
            CSV
          </ToggleGroupItem>
        </ToggleGroup>

        {source === 'csv' && (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground hover:bg-accent">
            <Upload className="size-4" />
            Choose a .csv file (or paste its contents below)

            <input
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.item(0)
                if (file) void readFile(file)
              }}
              type="file"
            />
          </label>
        )}

        <Textarea
          aria-label={source === 'csv' ? 'CSV contents' : 'Card list'}
          className="min-h-64 font-mono text-sm"
          onChange={event => setText(event.target.value)}
          placeholder={source === 'csv' ? csvExample : textExample}
          value={text}
        />

        {errors.length > 0 && (
          <div className="rounded-lg border border-have/40 bg-have/10 p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-have">
              <AlertTriangle className="size-4" />

              {`${errors.length} lines were skipped`}
            </p>

            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {errors.slice(0, 5).map(error => <li key={error.line}>{`Line ${error.line}: ${error.message}`}</li>)}
            </ul>
          </div>
        )}
      </div>

      <aside className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="space-y-1.5">
          <Label>Import into</Label>

          <ToggleGroup
            aria-label="Binder section"
            className="w-full"
            onValueChange={value => isBinderSection(value) && setSection(value)}
            type="single"
            value={section}
            variant="outline"
          >
            {(['collection', 'haves', 'wants'] as const).map(option => (
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
          <div className="space-y-1.5">
            <Label>List</Label>

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
                {sectionLists.length === 0 && <SelectItem value="default">{`New “My ${section}” list`}</SelectItem>}

                {sectionLists.map(list => (
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

        <p className="text-sm text-muted-foreground">
          {source === 'csv'
            ? 'Columns are matched by name: Name (required), Set, Number, Quantity, Foil, Condition, Language.'
            : 'One card per line: quantity, name, then optionally (SET) and collector number. *F* marks a foil.'}
        </p>

        <Button
          className="w-full"
          disabled={!text.trim() || create.isPending}
          onClick={submit}
        >
          {create.isPending ? <Loader2 className="animate-spin" /> : <Check />}
          Preview import
        </Button>
      </aside>
    </div>
  )
}

function ImportReview({ done, importId }: {
  importId: string;
  done: boolean
}) {
  const { user } = Route.useRouteContext()
  const navigate = Route.useNavigate()
  const { data: draft } = useSuspenseQuery(binderImportQuery(user.id, importId))
  const { data: lists } = useSuspenseQuery(tradeListsQuery(user.id))
  const updateRow = useWorkspaceMutation((services, input: {
    line: number;
    cardId?: string;
    include?: boolean
  }) => services.binder.updateImportRow(importId, input.line, {
    cardId: input.cardId,
    include: input.include,
  }))
  const commit = useWorkspaceMutation(services => services.binder.commitImport(importId))

  if (!draft) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="font-semibold">This import has expired.</p>

        <Button
          asChild
          className="mt-4"
          variant="outline"
        >
          <Link to="/x/binder/import">Start a new import</Link>
        </Button>
      </div>
    )
  }

  const destination = draft.section === 'collection' ? 'your collection' : lists.find(list => list.id === draft.listId)?.name ?? sectionLabels[draft.section]

  if (done || draft.committedAt) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center">
        <CheckCircle2 className="size-10 text-want" />

        <p className="text-xl font-bold">{`Imported ${draft.importedCount} cards`}</p>

        <p className="text-muted-foreground">{`They are now in ${destination}.`}</p>

        <div className="flex gap-2">
          <Button asChild>
            <Link
              search={{ section: draft.section }}
              to="/x/binder"
            >
              Go to binder
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
          >
            <Link
              search={{ section: draft.section }}
              to="/x/binder/import"
            >
              Import more
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const included = draft.rows.filter(row => row.include && row.card)
  const unmatched = draft.rows.filter(row => !row.card)
  const cards = included.reduce((total, row) => total + row.quantity, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <Summary
          label="Cards to import"
          value={cards}
        />

        <Summary
          label="Matched lines"
          value={draft.rows.length - unmatched.length}
        />

        <Summary
          className={unmatched.length > 0 ? 'text-have' : undefined}
          label="Need a match"
          value={unmatched.length}
        />

        <div className="ml-auto flex gap-2">
          <Button
            asChild
            variant="ghost"
          >
            <Link
              search={{ section: draft.section }}
              to="/x/binder/import"
            >
              <ArrowLeft />
              Start over
            </Link>
          </Button>

          <Button
            disabled={cards === 0 || commit.isPending}
            onClick={() => commit.mutate(undefined, {
              onSuccess: () => void navigate({
                search: previous => ({
                  ...previous,
                  step: 'done',
                }),
              }),
            })}
          >
            {commit.isPending ? <Loader2 className="animate-spin" /> : <Check />}

            {`Import ${cards} cards into ${destination}`}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />

              <TableHead className="w-14">Line</TableHead>

              <TableHead>As written</TableHead>

              <TableHead>Matched card</TableHead>

              <TableHead className="text-right">Qty</TableHead>

              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {draft.rows.map(row => (
              <ImportRowView
                key={row.line}
                onInclude={include => updateRow.mutate({
                  include,
                  line: row.line,
                })}
                onPick={cardId => updateRow.mutate({
                  cardId,
                  line: row.line,
                })}
                row={row}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function ImportRowView({ onInclude, onPick, row }: {
  row: BinderImport['rows'][number];
  onInclude: (include: boolean) => void;
  onPick: (cardId: string) => void
}) {
  return (
    <TableRow className={cn(!row.include && 'opacity-60')}>
      <TableCell>
        <Checkbox
          aria-label={`Import line ${row.line}`}
          checked={row.include}
          disabled={!row.card}
          onCheckedChange={checked => onInclude(checked === true)}
        />
      </TableCell>

      <TableCell className="text-muted-foreground tabular-nums">{row.line}</TableCell>

      <TableCell className="max-w-56 truncate font-mono text-xs">{row.raw}</TableCell>

      <TableCell>
        {row.card
          ? (
            <span className="flex items-center gap-2">
              <CardArt
                card={row.card}
                className="w-7 shrink-0"
                finish={row.finish}
              />

              <span className="min-w-0">
                <span className="block truncate font-semibold">{row.card.name}</span>

                <span className="block truncate text-xs text-muted-foreground">{`${row.card.setName} · #${row.card.number}`}</span>
              </span>
            </span>
          )
          : (
            <div className="max-w-72 space-y-1">
              <p className="flex items-center gap-1 text-xs font-semibold text-have">
                <AlertTriangle className="size-3" />
                No match — pick the card
              </p>

              <CardSearchBox
                initialQuery={row.name}
                onPick={card => onPick(card.id)}
                placeholder="Find the card"
              />
            </div>
          )}
      </TableCell>

      <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>

      <TableCell className="text-right">{row.card ? <Price amount={row.card.prices[row.finish] ?? row.card.prices.nonfoil} /> : '—'}</TableCell>
    </TableRow>
  )
}

function Summary({ className, label, value }: {
  label: string;
  value: number;
  className?: string
}) {
  return (
    <div className="pr-4">
      <p className={cn('text-2xl font-bold tabular-nums', className)}>{value}</p>

      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
