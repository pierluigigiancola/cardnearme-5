import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'

import { helpArticlesQuery } from '#/services/queries'

export const Route = createFileRoute('/help/')({
  head: () => ({ meta: [{ title: 'Help centre | CardNearMe' }] }),
  component: HelpIndex,
})

const featured = ['scanner', 'collection', 'trading', 'stores']

function HelpIndex() {
  const { data: articles } = useSuspenseQuery(helpArticlesQuery())
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Popular guides</h2>

        <p className="text-muted-foreground">Fill your Collection, mark Haves and Wants, and meet other Traders at the Stores you already play at.</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {articles.filter(article => featured.includes(article.slug)).map(article => (
          <li key={article.slug}>
            <Link
              className="block h-full rounded-xl border bg-card p-4 transition hover:border-primary/60"
              params={{ topic: article.slug }}
              to="/help/$topic"
            >
              <p className="font-semibold">{article.title}</p>

              <p className="text-sm text-muted-foreground">{article.summary}</p>

              <p className="mt-2 text-sm font-semibold text-primary">Read the guide →</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
