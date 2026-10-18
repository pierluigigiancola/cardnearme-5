import { cn } from '#/lib/utils'

export const APP_NAME = 'CardNearMe'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn('size-8', className)}
      viewBox="0 0 32 32"
    >
      <rect
        className="fill-primary/25"
        height="20"
        rx="3"
        transform="rotate(-12 11 14)"
        width="14"
        x="4"
        y="4"
      />

      <rect
        className="fill-primary"
        height="20"
        rx="3"
        width="14"
        x="10"
        y="6"
      />

      <path
        className="fill-primary-foreground"
        d="M17 10.5a3.5 3.5 0 0 0-3.5 3.5c0 2.6 3.5 6.5 3.5 6.5s3.5-3.9 3.5-6.5a3.5 3.5 0 0 0-3.5-3.5Zm0 4.8a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"
      />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2 font-extrabold tracking-tight', className)}>
      <LogoMark />

      <span className="text-lg">
        Card
        <span className="text-primary">NearMe</span>
      </span>
    </span>
  )
}
