import { Link } from '@tanstack/react-router'

import { footerNav } from './navigation'

import { Logo } from '#/components/brand/Logo'
import { useConsent } from '#/integrations/posthog/provider'

export function AppFooter() {
  const { openSettings } = useConsent()

  return (
    <footer className="mt-16 border-t bg-card/40">
      <div className="page-wrap grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-1">
          <Logo />

          <p className="text-sm text-muted-foreground">Trade cards with players at the stores where you already play.</p>
        </div>

        {footerNav.map(group => (
          <div key={group.title}>
            <p className="mb-2 text-sm font-bold">{group.title}</p>

            <ul className="space-y-1.5 text-sm">
              {group.links.map(link => (
                <li key={link.to}>
                  <Link
                    className="text-muted-foreground hover:text-foreground"
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="page-wrap flex flex-wrap items-center justify-between gap-2 border-t py-4 text-xs text-muted-foreground">
        <span>Card names and images belong to their respective publishers. Prices are indicative.</span>

        <button
          className="underline hover:text-foreground"
          onClick={openSettings}
          type="button"
        >
          Cookie settings
        </button>
      </div>
    </footer>
  )
}
