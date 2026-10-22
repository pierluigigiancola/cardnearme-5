import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { helpArticlesQuery } from '#/services/queries'

export const Route = createFileRoute('/help')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(helpArticlesQuery()),
  component: HelpLayout,
})

function HelpLayout() {
  const { data: articles } = useSuspenseQuery(helpArticlesQuery())
  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{ label: 'Help centre' }]}
        description="How-tos for your Binder, Trades, decks and Stores"
        title="Help centre"
      />

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <nav className="flex flex-col gap-1">
            {articles.map(article => (
              <Link
                activeProps={{ className: 'bg-primary/15 text-primary' }}
                className="rounded-lg px-3 py-2 text-sm"
                key={article.slug}
                params={{ topic: article.slug }}
                to="/help/$topic"
              >
                <span className="font-semibold">{article.title}</span>

                <span className="block text-xs text-muted-foreground">{article.summary}</span>
              </Link>
            ))}
          </nav>

          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="font-semibold">Can't find it?</p>

            <p className="text-muted-foreground">Send us a message and a person will reply.</p>

            <Button
              asChild
              className="mt-3"
              size="sm"
            >
              <Link to="/contact">Contact support</Link>
            </Button>
          </div>
        </aside>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
