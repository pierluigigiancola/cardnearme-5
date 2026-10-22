import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthForm, sanitizeRedirect } from '#/auth/AuthForm'
import { authConfigQuery } from '#/auth/viewer'

export const Route = createFileRoute('/sign-up')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({ redirect: sanitizeRedirect(search.redirect) }),
  beforeLoad: ({ context, search }) => {
    if (context.viewer.kind === 'user') throw redirect({ href: search.redirect ?? '/' })
  },
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(authConfigQuery()),
  head: () => ({
    meta: [{ title: 'Sign up | CardNearMe' }, {
      content: 'noindex',
      name: 'robots',
    }],
  }),
  component: SignUpPage,
})

function SignUpPage() {
  const { redirect: returnTo } = Route.useSearch()
  return (
    <div className="page-wrap max-w-md py-12">
      <AuthForm
        mode="sign-up"
        redirect={returnTo}
      />
    </div>
  )
}
