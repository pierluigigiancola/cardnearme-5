import { Outlet, createFileRoute, redirect, useMatch } from '@tanstack/react-router'

import { WorkspaceNav } from '#/components/workspace/WorkspaceNav'
import { gamesQuery, profileQuery, unreadCountsQuery } from '#/services/queries'

/**
 * Signed-in workspace. Navigation guard only — every private server function
 * must check the session itself (route guards do not protect server functions).
 */
export const Route = createFileRoute('/x')({
  beforeLoad: ({ context, location }) => {
    const { viewer } = context
    if (viewer.kind === 'anonymous') {
      throw redirect({
        search: { redirect: location.href },
        to: '/sign-in',
      })
    }
    if (!viewer.onboarded && location.pathname !== '/x/onboarding') {
      throw redirect({
        search: { redirect: location.href },
        to: '/x/onboarding',
      })
    }
    return { user: viewer }
  },
  loader: async ({ context: { queryClient, user } }) => {
    await Promise.all([
      queryClient.ensureQueryData(profileQuery(user.id)),
      queryClient.ensureQueryData(gamesQuery()),
      queryClient.ensureQueryData(unreadCountsQuery(user.id)),
    ])
  },
  component: WorkspaceLayout,
})

function WorkspaceLayout() {
  const onboarding = useMatch({
    from: '/x/onboarding',
    shouldThrow: false,
  })
  return (
    <>
      {!onboarding && <WorkspaceNav />}

      <Outlet />
    </>
  )
}
