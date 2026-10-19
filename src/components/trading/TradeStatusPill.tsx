import { cn } from '#/lib/utils'
import type { TradeStatus } from '#/services/types'

const styles: Record<TradeStatus, string> = {
  accepted: 'bg-want/15 text-want',
  cancelled: 'bg-muted text-muted-foreground',
  completed: 'bg-match/15 text-match',
  pending: 'bg-have/15 text-have',
}

const labels: Record<TradeStatus, string> = {
  accepted: 'Accepted',
  cancelled: 'Cancelled',
  completed: 'Completed',
  pending: 'Pending',
}

export function TradeStatusPill({ className, status }: {
  status: TradeStatus;
  className?: string
}) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold', styles[status], className)}>{labels[status]}</span>
}
