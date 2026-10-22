import { cn } from '#/lib/utils'
import type { Card, CardColor, Finish } from '#/services/types'

const colorHues: Record<CardColor, number> = {
  B: 300,
  C: 220,
  G: 145,
  R: 25,
  U: 230,
  W: 85,
}

/**
 * Placeholder card art generated from card data. Swap for real images
 * (`<img src={card.imageUrl}>`) once a card data source is connected.
 */
export function CardArt({ card, className, finish = 'nonfoil' }: {
  card: Pick<Card, 'id' | 'name' | 'colors' | 'typeLine' | 'setCode' | 'number' | 'rarity'>;
  className?: string;
  finish?: Finish
}) {
  const first = card.colors.at(0) ?? 'C'
  const second = card.colors.at(1)
  const hueA = colorHues[first]
  const hueB = second ? colorHues[second] : hueA + 30
  const gradientId = `art-${card.id}-${finish}`

  return (
    <div className={cn('@container relative aspect-[63/88] overflow-hidden rounded-[4.5%] bg-muted shadow-sm ring-1 ring-black/10', className)}>
      <svg
        aria-label={card.name}
        className="absolute inset-0 size-full"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 63 88"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            x2="1"
            y1="0"
            y2="1"
          >
            <stop
              offset="0"
              stopColor={`oklch(0.62 0.12 ${hueA})`}
            />

            <stop
              offset="1"
              stopColor={`oklch(0.38 0.1 ${hueB})`}
            />
          </linearGradient>
        </defs>

        <rect
          fill="oklch(0.18 0.01 240)"
          height="88"
          width="63"
        />

        <rect
          fill={`url(#${gradientId})`}
          height="84"
          rx="2.5"
          width="59"
          x="2"
          y="2"
        />

        <rect
          fill="oklch(0.95 0.01 90 / 0.85)"
          height="6"
          rx="1"
          width="53"
          x="5"
          y="5"
        />

        <rect
          fill="oklch(0.3 0.05 240 / 0.45)"
          height="34"
          rx="1"
          width="53"
          x="5"
          y="13"
        />

        <circle
          cx="31.5"
          cy="30"
          fill={`oklch(0.85 0.1 ${hueA} / 0.55)`}
          r="10"
        />

        <rect
          fill="oklch(0.95 0.01 90 / 0.8)"
          height="5"
          rx="1"
          width="53"
          x="5"
          y="49"
        />

        <rect
          fill="oklch(0.95 0.01 90 / 0.7)"
          height="26"
          rx="1"
          width="53"
          x="5"
          y="56"
        />
      </svg>

      <div className="absolute inset-x-[9%] top-[6.5%] truncate text-[clamp(6px,0.9cqw+5px,11px)] leading-tight font-bold text-neutral-900">
        {card.name}
      </div>

      <div className="absolute inset-x-[9%] top-[56.5%] truncate text-[clamp(5px,0.7cqw+4px,9px)] leading-tight font-medium text-neutral-800">
        {card.typeLine}
      </div>

      <div className="absolute right-[9%] bottom-[3.5%] text-[clamp(5px,0.6cqw+3px,8px)] font-semibold text-white/80 uppercase">
        {card.setCode}

        {' '}
        #

        {card.number}
      </div>

      {finish !== 'nonfoil' && (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.35)_40%,rgba(255,0,200,0.15)_55%,rgba(0,255,255,0.15)_65%,transparent_80%)] mix-blend-overlay" />
      )}
    </div>
  )
}
