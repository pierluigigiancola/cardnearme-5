import { Minus, Plus } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

export function QuantityStepper({ className, label = 'Quantity', max = 999, min = 1, onChange, value }: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string
}) {
  return (
    <div
      aria-label={label}
      className={cn('inline-flex items-center rounded-md border', className)}
      role="group"
    >
      <Button
        aria-label={`Decrease ${label.toLowerCase()}`}
        className="rounded-r-none"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <Minus />
      </Button>

      <span className="min-w-7 text-center text-sm font-semibold tabular-nums">{value}</span>

      <Button
        aria-label={`Increase ${label.toLowerCase()}`}
        className="rounded-l-none"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <Plus />
      </Button>
    </div>
  )
}
