import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'

import { getSupabaseServerClient } from '#/supabase/supabase.server'

/**
 * Who is looking at the page. Anonymous visitors can browse; signed-in users
 * unlock trading actions. Keep every "can the viewer do X" decision in this
 * module and `limits.ts` so the rules live in one place.
 */
export type Viewer =
  | { kind: 'anonymous' }
  | {
    kind: 'user'
    id: string
    email: string
    username: string
    /** True when signed in through the local demo fallback, not Supabase. */
    demo: boolean
  }

const DEMO_COOKIE = 'cnm-demo-user'

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}

function demoAuthAllowed() {
  return process.env.NODE_ENV !== 'production' && !isSupabaseConfigured()
}

export const fetchAuthConfig = createServerFn({ method: 'GET' }).handler(async () => ({
  demoAuth: demoAuthAllowed(),
  supabase: isSupabaseConfigured(),
}))

export const fetchViewer = createServerFn({ method: 'GET' }).handler(async (): Promise<Viewer> => {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) return { kind: 'anonymous' }
    const metadata = user.user_metadata as { username?: string }
    return {
      demo: false,
      email: user.email ?? '',
      id: user.id,
      kind: 'user',
      username: metadata.username ?? user.email?.split('@')[0] ?? 'trader',
    }
  }

  const demoUser = demoAuthAllowed() ? getCookie(DEMO_COOKIE) : undefined
  if (!demoUser) return { kind: 'anonymous' }
  return {
    demo: true,
    email: `${demoUser}@example.com`,
    id: `demo-${demoUser}`,
    kind: 'user',
    username: demoUser,
  }
})

/** Dev-only sign-in used while Supabase env vars are not configured. */
export const demoSignIn = createServerFn({ method: 'POST' })
  .validator((data: { username: string }) => {
    const username = data.username.trim().toLowerCase()
    if (!/^[a-z0-9_-]{2,24}$/.test(username)) throw new Error('Username must be 2-24 letters, numbers, - or _')
    return { username }
  })
  .handler(async ({ data }) => {
    if (!demoAuthAllowed()) throw new Error('Demo sign-in is disabled')
    setCookie(DEMO_COOKIE, data.username, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    })
  })

export const demoSignOut = createServerFn({ method: 'POST' }).handler(async () => {
  deleteCookie(DEMO_COOKIE, { path: '/' })
})

export const viewerQuery = () =>
  queryOptions({
    queryFn: () => fetchViewer(),
    queryKey: ['viewer'],
    staleTime: Infinity,
  })

export const authConfigQuery = () =>
  queryOptions({
    queryFn: () => fetchAuthConfig(),
    queryKey: ['auth-config'],
    staleTime: Infinity,
  })
