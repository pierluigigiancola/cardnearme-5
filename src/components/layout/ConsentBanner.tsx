import { Link } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { useConsent } from '#/integrations/posthog/provider'

/**
 * Asks whether analytics may run. Shown until the visitor chooses, and again
 * when they open "Cookie settings" from the footer. Accept and decline share
 * one style so neither is nudged.
 */
export function ConsentBanner() {
  const { choice, decide, settingsOpen } = useConsent()

  if (choice === undefined) return null
  if (choice !== null && !settingsOpen) return null

  return (
    <section
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-card shadow-lg"
    >
      <div className="page-wrap flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We'd like to use analytics cookies to understand how CardNearMe is used. Nothing is tracked unless you accept.
          {' '}

          <Link
            className="underline hover:text-foreground"
            to="/privacy"
          >
            Privacy
          </Link>
        </p>

        <div className="flex shrink-0 gap-2">
          <Button
            onClick={() => decide('declined')}
            variant="outline"
          >
            Decline
          </Button>

          <Button
            onClick={() => decide('accepted')}
            variant="outline"
          >
            Accept
          </Button>
        </div>
      </div>
    </section>
  )
}
