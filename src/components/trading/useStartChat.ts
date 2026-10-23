import { useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'

import { useWorkspaceMutation } from '#/services/mutations'
import type { UserId } from '#/services/types'

/** Opens (or starts) the conversation with a trader and navigates to it. */
export function useStartChat() {
  const router = useRouter()
  const { isPending, mutate } = useWorkspaceMutation((services, partner: UserId) => services.chat.openChat(partner))
  const startChat = useCallback((partner: UserId) => {
    mutate(partner, {
      onSuccess: chat => void router.navigate({
        params: { chatId: chat.id },
        to: '/x/inbox/$chatId',
      }),
    })
  }, [mutate, router])
  return {
    isPending,
    startChat,
  }
}
