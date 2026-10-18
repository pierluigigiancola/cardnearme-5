import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

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
  component: () => <Outlet />,
})
