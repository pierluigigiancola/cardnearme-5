import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'

import { faqQuery, helpArticleQuery } from '#/services/queries'

export const Route = createFileRoute('/help/$topic')({
  loader: async ({ context: { queryClient }, params }) => {
    const article = await queryClient.ensureQueryData(helpArticleQuery(params.topic))
    if (!article) throw notFound()
    if (article.slug === 'faq') await queryClient.ensureQueryData(faqQuery())
    return article
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.title} — Help centre | CardNearMe` : 'Help | CardNearMe' }] }),
  component: HelpArticlePage,
})

function HelpArticlePage() {
  const article = Route.useLoaderData()
  return (
    <article className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{article.title}</h2>

        <p className="text-muted-foreground">{article.summary}</p>
      </div>

      {article.slug === 'faq' && <FaqList />}

      {article.sections.map(section => (
        <section
          className="space-y-1"
          key={section.heading}
        >
          <h3 className="font-semibold">{section.heading}</h3>

          <p className="text-muted-foreground">{section.body}</p>
        </section>
      ))}
    </article>
  )
}

function FaqList() {
  const { data: faq } = useSuspenseQuery(faqQuery())
  return (
    <div className="divide-y rounded-xl border bg-card">
      {faq.map(entry => (
        <details
          className="p-4"
          key={entry.question}
        >
          <summary className="cursor-pointer font-semibold">{entry.question}</summary>

          <p className="mt-2 text-sm text-muted-foreground">{entry.answer}</p>
        </details>
      ))}
    </div>
  )
}
