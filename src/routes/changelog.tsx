import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '#/components/layout/PageHeader'
import { Badge } from '#/components/ui/badge'
import { formatDate } from '#/lib/format'
import { changelogQuery } from '#/services/queries'

export const Route = createFileRoute('/changelog')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(changelogQuery()),
  head: () => ({ meta: [{ title: 'What\'s new | CardNearMe' }] }),
  component: ChangelogPage,
})

function ChangelogPage() {
  const { data: entries } = useSuspenseQuery(changelogQuery())
  return (
    <div className="page-wrap max-w-3xl">
      <PageHeader
        description="Features, improvements and fixes"
        title="Changelog"
      />

      <ol className="space-y-8 border-l pl-6">
        {entries.map((entry, index) => (
          <li
            className="relative"
            key={entry.date}
          >
            <span className="absolute top-1.5 -left-[31px] size-3 rounded-full bg-primary" />

            <p className="flex items-center gap-2 font-bold">
              {formatDate(entry.date)}

              {index === 0 && <Badge>Latest</Badge>}
            </p>

            {([['New', entry.added], ['Improvements', entry.improved], ['Fixes', entry.fixed]] as const).map(([label, items]) =>
              items.length > 0 && (
                <div
                  className="mt-3"
                  key={label}
                >
                  <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    {label}

                    {' ('}

                    {items.length}
                    )
                  </p>

                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {items.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
          </li>
        ))}
      </ol>
    </div>
  )
}
