import { Badge } from '#/components/ui/badge'
import { formatPrice } from '#/lib/format'
import { cn } from '#/lib/utils'
import type { Condition, Finish, Game, Rarity } from '#/services/types'

export function GameBadge({ game, className }: {
  game: Pick<Game, 'shortName' | 'hue'>;
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', className)}
      style={{
        backgroundColor: `oklch(0.7 0.12 ${game.hue} / 0.15)`,
        borderColor: `oklch(0.7 0.12 ${game.hue} / 0.4)`,
      }}
    >
      {game.shortName}
    </span>
  )
}

export function Price({ amount, className }: {
  amount: number | null | undefined;
  className?: string
}) {
  return <span className={cn('font-semibold text-price tabular-nums', className)}>{formatPrice(amount)}</span>
}

export function PriceChange({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground">0%</span>
  return (
    <span className={cn('tabular-nums', value > 0 ? 'text-want' : 'text-destructive-foreground')}>
      {value > 0 ? '+' : ''}

      {value.toFixed(1)}
      %
    </span>
  )
}

const rarityClass: Record<Rarity, string> = {
  common: 'text-muted-foreground',
  mythic: 'text-orange-400',
  rare: 'text-amber-300',
  special: 'text-match',
  uncommon: 'text-sky-300',
}

export function RarityLabel({ rarity }: { rarity: Rarity }) {
  return <span className={cn('text-xs font-semibold capitalize', rarityClass[rarity])}>{rarity}</span>
}

export function ConditionBadge({ condition }: { condition: Condition }) {
  return (
    <Badge
      className="font-mono text-[10px]"
      variant="secondary"
    >
      {condition}
    </Badge>
  )
}

export function FinishBadge({ finish }: { finish: Finish }) {
  if (finish === 'nonfoil') return null
  return <Badge className="bg-match/20 text-[10px] text-match capitalize">{finish}</Badge>
}
