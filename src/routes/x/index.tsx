import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/x/')({
  beforeLoad: () => {
    throw redirect({ to: '/x/binder' })
  },
})
