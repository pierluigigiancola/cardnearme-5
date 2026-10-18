import { Link, useLocation } from '@tanstack/react-router'
import { LockKeyhole } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { gatedActions } from './limits'
import type { GatedAction } from './limits'
import { useViewer } from './useViewer'


import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { cn } from '#/lib/utils'

export function SignedIn({ children }: { children: ReactNode }) {
  const viewer = useViewer()
  return viewer.kind === 'user' ? children : null
}

export function SignedOut({ children }: { children: ReactNode }) {
  const viewer = useViewer()
  return viewer.kind === 'anonymous' ? children : null
}

/** Current location, used as the post-auth return path. */
export function useReturnPath() {
  return useLocation({ select: location => location.href })
}

export function AuthLinks({ onNavigate, size = 'default' }: {
  size?: 'sm' | 'default' | 'lg';
  /** Called when either link is followed (e.g. to close the dialog it sits in). */
  onNavigate?: () => void
}) {
  const redirect = useReturnPath()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        asChild
        size={size}
      >
        <Link
          onClick={onNavigate}
          search={{ redirect }}
          to="/sign-up"
        >
          Sign up free
        </Link>
      </Button>

      <Button
        asChild
        size={size}
        variant="ghost"
      >
        <Link
          onClick={onNavigate}
          search={{ redirect }}
          to="/sign-in"
        >
          Sign in
        </Link>
      </Button>
    </div>
  )
}

/** Inline placeholder shown in place of a feature that needs an account. */
export function GatedPanel({ action, className, title }: {
  action: GatedAction;
  className?: string;
  title?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center', className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
        <LockKeyhole className="size-5" />
      </span>

      <div>
        <p className="font-semibold">{title ?? 'Free account required'}</p>

        <p className="text-sm text-muted-foreground">
          Sign up to
          {' '}

          {gatedActions[action]}
          .
        </p>
      </div>

      <AuthLinks size="sm" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Imperative prompt: `const requireAuth = useRequireAuth(); onClick={() => requireAuth('trade', run)}`
// ---------------------------------------------------------------------------

type RequireAuth = (action: GatedAction, run?: () => void) => void

const AuthPromptContext = createContext<RequireAuth | null>(null)

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const viewer = useViewer()
  const [action, setAction] = useState<GatedAction | null>(null)

  const requireAuth = useCallback<RequireAuth>((nextAction, run) => {
    if (viewer.kind === 'user') {
      run?.()
      return
    }
    setAction(nextAction)
  }, [viewer.kind])

  const value = useMemo(() => requireAuth, [requireAuth])

  return (
    <AuthPromptContext value={value}>
      {children}

      <Dialog
        onOpenChange={open => !open && setAction(null)}
        open={action !== null}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a free account</DialogTitle>

            <DialogDescription>
              Sign up to
              {' '}

              {action ? gatedActions[action] : 'continue'}
              . You will come straight back to this page.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="sm:justify-start">
            <AuthLinks onNavigate={() => setAction(null)} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthPromptContext>
  )
}

export function useRequireAuth() {
  const context = useContext(AuthPromptContext)
  if (!context) throw new Error('useRequireAuth must be used inside AuthPromptProvider')
  return context
}
