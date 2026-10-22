import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { useRefreshViewer } from './useViewer'
import { authConfigQuery, demoSignIn } from './viewer'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { getSupabaseBrowserClient } from '#/supabase/supabase.browser'

type Mode = 'sign-in' | 'sign-up'
type OAuthProvider = 'google' | 'discord' | 'apple'

const providers: {
  id: OAuthProvider;
  label: string
}[] = [
  {
    id: 'google',
    label: 'Google',
  },
  {
    id: 'discord',
    label: 'Discord',
  },
  {
    id: 'apple',
    label: 'Apple',
  },
]

/** Keeps post-auth redirects on this site (prevents open redirects). */
export function sanitizeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return undefined
  return value
}

export function AuthForm({ mode, redirect }: {
  mode: Mode;
  redirect?: string
}) {
  const { data: config } = useSuspenseQuery(authConfigQuery())
  const router = useRouter()
  const refresh = useRefreshViewer()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const destination = mode === 'sign-up' ? `/x/onboarding${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}` : (redirect ?? '/')

  const finish = async () => {
    await refresh()
    await router.navigate({ href: destination })
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const field = (name: string) => {
      const value = form.get(name)
      return typeof value === 'string' ? value : ''
    }
    setError(null)
    setPending(true)
    try {
      if (!config.supabase) {
        await demoSignIn({ data: { username: field('username') } })
        await finish()
        return
      }
      const supabase = getSupabaseBrowserClient()
      if (mode === 'sign-in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: field('email'),
          password: field('password'),
        })
        if (signInError) throw signInError
        await finish()
      }
      else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: field('email'),
          options: {
            data: {
              onboarded: false,
              username: field('username'),
            },
            emailRedirectTo: `${window.location.origin}${destination}`,
          },
          password: field('password'),
        })
        if (signUpError) throw signUpError
        if (data.session) await finish()
        else setNotice('Check your inbox to confirm your email, then come back to sign in.')
      }
    }
    catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong')
    }
    finally {
      setPending(false)
    }
  }

  const signInWithProvider = async (provider: OAuthProvider) => {
    const { error: oauthError } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      options: { redirectTo: `${window.location.origin}${destination}` },
      provider,
    })
    if (oauthError) setError(oauthError.message)
  }

  if (notice) {
    return <p className="rounded-xl border bg-card p-6 text-center">{notice}</p>
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-xl">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold">{mode === 'sign-in' ? 'Welcome back' : 'Create your free account'}</h1>

        <p className="text-sm text-muted-foreground">{mode === 'sign-in' ? 'Sign in to continue trading' : 'List your cards and get matched with local traders'}</p>
      </div>

      {config.supabase
        ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {providers.map(provider => (
                <Button
                  key={provider.id}
                  onClick={() => void signInWithProvider(provider.id)}
                  type="button"
                  variant="outline"
                >
                  {provider.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or

              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )
        : (
          <p className="rounded-lg border border-have/40 bg-have/10 p-3 text-sm">
            Supabase is not configured (set
            {' '}

            <code>SUPABASE_URL</code>
            ,

            {' '}

            <code>SUPABASE_ANON_KEY</code>

            {' '}
            and the

            {' '}

            <code>VITE_</code>

            {' '}
            equivalents).

            {config.demoAuth ? ' Using a local demo account for development.' : ' Sign-in is unavailable.'}
          </p>
        )}

      <form
        className="space-y-4"
        onSubmit={event => void onSubmit(event)}
      >
        {(mode === 'sign-up' || !config.supabase) && (
          <div className="space-y-1.5">
            <Label htmlFor="auth-username">Username</Label>

            <Input
              autoComplete="username"
              id="auth-username"
              name="username"
              pattern="[A-Za-z0-9_\-]{2,24}"
              required
            />
          </div>
        )}

        {config.supabase && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="auth-email">Email</Label>

              <Input
                autoComplete="email"
                id="auth-email"
                name="email"
                required
                type="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="auth-password">Password</Label>

              <Input
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                id="auth-password"
                minLength={8}
                name="password"
                required
                type="password"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive-foreground">{error}</p>}

        <Button
          className="w-full"
          disabled={pending || (!config.supabase && !config.demoAuth)}
          type="submit"
        >
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === 'sign-in' ? 'No account yet? ' : 'Already have an account? '}

        <Link
          className="font-semibold text-primary"
          search={{ redirect }}
          to={mode === 'sign-in' ? '/sign-up' : '/sign-in'}
        >
          {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
        </Link>
      </p>
    </div>
  )
}
