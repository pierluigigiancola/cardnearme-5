import { Construction } from 'lucide-react'

import { PageHeader } from './PageHeader'

/**
 * Stand-in for signed-in pages that ticket 02 implements. Lists what the page
 * will contain so the shell is navigable and the scope is visible.
 */
export function WorkspacePlaceholder({ description, features, title }: {
  title: string;
  description: string;
  features: string[]
}) {
  return (
    <div className="page-wrap">
      <PageHeader
        crumbs={[{ label: title }]}
        description={description}
        title={title}
      />

      <div className="rounded-2xl border border-dashed bg-card/50 p-8">
        <p className="flex items-center gap-2 font-semibold text-have">
          <Construction className="size-5" />
          Coming in ticket 02
        </p>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {features.map(feature => <li key={feature}>{feature}</li>)}
        </ul>
      </div>
    </div>
  )
}
