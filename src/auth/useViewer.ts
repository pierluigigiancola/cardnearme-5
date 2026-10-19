import { useQueryClient } from '@tanstack/react-query'
import { useRouteContext, useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'

import { demoSignOut } from './viewer'

import { getSupabaseBrowserClient } from '#/supabase/supabase.browser'

export function useViewer() {
  return useRouteContext({
    from: '__root__',
    select: context => context.viewer,
  })
}

/** The signed-in viewer, for components that only render inside `/x` or behind `requireAuth`. */
export function useSignedInViewer() {
  const viewer = useViewer()
  if (viewer.kind !== 'user') throw new Error('useSignedInViewer needs a signed-in viewer')
  return viewer
}

/** Re-reads the session after sign in / sign out and re-runs route guards. */
export function useRefreshViewer() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useCallback(async () => {
    // The viewer query is only read in the root beforeLoad (no observers), so
    // invalidating would not refetch it; drop it so ensureQueryData reloads.
    queryClient.removeQueries({
      exact: true,
      queryKey: ['viewer'],
    })
    await router.invalidate()
  }, [queryClient, router])
}

export function useSignOut() {
  const viewer = useViewer()
  const refresh = useRefreshViewer()
  return useCallback(async () => {
    if (viewer.kind === 'user' && viewer.demo) {
      await demoSignOut()
    }
    else {
      await getSupabaseBrowserClient().auth.signOut()
    }
    await refresh()
  }, [refresh, viewer])
}
