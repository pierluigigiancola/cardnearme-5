import { createFileRoute, redirect } from '@tanstack/react-router'

import { detectedCityQuery } from '#/services/queries'

/** "Find cards" sends visitors straight to the trading page of their city. */
export const Route = createFileRoute('/find-cards')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const city = await queryClient.ensureQueryData(detectedCityQuery())
    throw redirect({
      params: { city: city.slug },
      to: '/city/$city',
    })
  },
})
