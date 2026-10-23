import { Outlet, createFileRoute, useMatch } from '@tanstack/react-router'

import { guardWorkspace } from '#/auth/workspaceGuard'
import { WorkspaceNav } from '#/components/workspace/WorkspaceNav'
import { gamesQuery, profileQuery, unreadCountsQuery } from '#/services/queries'

/**
 * Signed-in workspace. Navigation guard only — every private server function
 * must check the session itself (route guards do not protect server functions).
 */
export const Route = createFileRoute('/x')({
  beforeLoad: async ({ context: { queryClient, viewer }, location }) => {
    const user = await guardWorkspace({
      href: location.href,
      // The profile comes from the workspace services on the server; onboarding is `profile.onboardedAt`.
      loadProfile: ({ id }) => queryClient.ensureQueryData(profileQuery(id)),
      pathname: location.pathname,
      viewer,
    })
    return { user }
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
