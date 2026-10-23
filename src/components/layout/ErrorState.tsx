import { AlertTriangle, RotateCw } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

/**
 * Shown when a query fails, so the page doesn't look empty instead.
 * `compact` fits inside lists, popovers and dialogs.
 */
export function ErrorState({ className, compact = false, error, onRetry, title = 'Something went wrong' }: {
  error: Error | null | undefined;
  title?: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center text-center',
        compact ? 'flex-wrap justify-center gap-x-3 gap-y-1 px-2 py-3 text-sm' : 'mx-auto max-w-lg flex-col gap-3 rounded-xl border border-dashed border-destructive/40 p-10',
        className,
      )}
      role="alert"
    >
      <AlertTriangle className={cn('shrink-0 text-destructive', compact ? 'size-4' : 'size-6')} />

      <div className={compact ? 'min-w-0 text-left' : undefined}>
        <p className="font-semibold">{title}</p>

        <p className="text-sm text-muted-foreground">{error?.message || 'Please try again.'}</p>
      </div>

      {onRetry && (
        <Button
          onClick={onRetry}
          size={compact ? 'xs' : 'sm'}
          type="button"
          variant="outline"
        >
          <RotateCw />
          Try again
        </Button>
      )}
    </div>
  )
}
