import { Link, createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About | CardNearMe' }] }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="page-wrap max-w-3xl">
      <PageHeader title="About CardNearMe" />

      <div className="prose dark:prose-invert">
        <p>
          CardNearMe started from a simple idea: the card you need is probably sitting in a binder a few tables away. Paying for shipping on cards that are
          already nearby does not add up.
        </p>

        <p>
          We help players list what they have and what they want, find matches at the stores they already visit, agree on a fair trade and meet in person.
        </p>

        <p>Core features are free. We are building this for the local trading community.</p>
      </div>

      <Button
        asChild
        className="mt-6"
      >
        <Link to="/contact">Get in touch</Link>
      </Button>
    </div>
  )
}
