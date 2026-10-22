import { useQuery } from '@tanstack/react-query'
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

import { useViewer } from '#/auth/useViewer'
import { profileQuery } from '#/services/queries'
import type { PricingSource } from '#/services/types'

const PricingContext = createContext<PricingSource>('cardmarket-eur')

/**
 * Pricing source chosen in settings (Cardmarket EUR or TCGplayer USD).
 * Anonymous visitors see Cardmarket prices.
 */
export function PricingProvider({ children }: { children: ReactNode }) {
  const viewer = useViewer()
  const signedIn = viewer.kind === 'user' && viewer.onboarded
  const { data: profile } = useQuery({
    ...profileQuery(viewer.kind === 'user' ? viewer.id : 'anonymous'),
    enabled: signedIn,
  })
  return <PricingContext value={signedIn ? profile?.pricingSource ?? 'cardmarket-eur' : 'cardmarket-eur'}>{children}</PricingContext>
}

export function usePricingSource() {
  return useContext(PricingContext)
}
