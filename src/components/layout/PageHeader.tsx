import { Link, useRouter } from '@tanstack/react-router'
import { Home } from 'lucide-react'
import type { ReactNode } from 'react'

import type { FileRoutesByTo } from '#/routeTree.gen'

export interface Crumb {
  label: string
  /** Pre-built href; omit for the current page. */
  href?: string
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const router = useRouter()
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
    >
      <Link
        aria-label="Home"
        className="hover:text-foreground"
        to="/"
      >
        <Home className="size-4" />
      </Link>

      {crumbs.map(crumb => (
        <span
          className="flex items-center gap-1.5"
          key={crumb.label}
        >
          <span aria-hidden="true">/</span>

          {crumb.href
            ? (
              <a
                className="hover:text-foreground"
                href={crumb.href}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || !crumb.href) return
                  event.preventDefault()
                  void router.navigate({ href: crumb.href })
                }}
              >
                {crumb.label}
              </a>
            )
            : <span className="text-foreground">{crumb.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function PageHeader({ actions, crumbs, description, title }: {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode
}) {
  return (
    <div className="space-y-3 pt-6 pb-4">
      {crumbs && <Breadcrumbs crumbs={crumbs} />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>

          {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function Section({ action, children, description, title }: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode
}) {
  return (
    <section className="space-y-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>

          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>

        {action}
      </div>

      {children}
    </section>
  )
}

export type RoutePath = keyof FileRoutesByTo
