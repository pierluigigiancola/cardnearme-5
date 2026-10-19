import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { cn } from '#/lib/utils'

/** Initials avatar tinted with the trader's hue, with an optional presence dot. */
export function TraderAvatar({ className, hue, online, username }: {
  username: string;
  hue: number;
  online?: boolean;
  className?: string
}) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <Avatar className="size-full">
        <AvatarFallback
          className="text-xs font-bold uppercase"
          style={{ backgroundColor: `oklch(0.6 0.12 ${hue} / 0.3)` }}
        >
          {username.slice(0, 2)}
        </AvatarFallback>
      </Avatar>

      {online !== undefined && (
        <span
          aria-label={online ? 'Online' : 'Offline'}
          className={cn('absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-background', online ? 'bg-want' : 'bg-muted-foreground/60')}
          role="img"
        />
      )}
    </span>
  )
}
