import { redirect } from '@tanstack/react-router'

import type { Viewer } from './viewer'

import type { WorkspaceProfile } from '#/services/types'

type SignedInViewer = Extract<Viewer, { kind: 'user' }>

interface WorkspaceVisit {
  viewer: Viewer
  /** Where the visitor was going, to come back to after signing in or onboarding. */
  href: string
  pathname: string
  /** Reads the Trader's profile through the workspace services, which run on the server. */
  loadProfile: (viewer: SignedInViewer) => Promise<WorkspaceProfile>
}

/**
 * Navigation guard for `/x`. Anonymous visitors go to sign in. A Trader goes
 * to onboarding until `profile.onboardedAt` is set, which only
 * `completeOnboarding` does. Route guards do not protect data: every private
 * server function still checks the session itself.
 */
export async function guardWorkspace({ href, loadProfile, pathname, viewer }: WorkspaceVisit): Promise<SignedInViewer> {
  if (viewer.kind === 'anonymous') {
    throw redirect({
      search: { redirect: href },
      to: '/sign-in',
    })
  }
  if (pathname === '/x/onboarding') return viewer
  const profile = await loadProfile(viewer)
  if (!profile.onboardedAt) {
    throw redirect({
      search: { redirect: href },
      to: '/x/onboarding',
    })
  }
  return viewer
}
