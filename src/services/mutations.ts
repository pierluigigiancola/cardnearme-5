import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getServices } from './services'
import type { Services } from './services'

/**
 * Mutation hook for workspace writes. On success every personal query
 * (`['me', …]`) is refreshed, so pages never show stale counts after an
 * edit; failures surface as a toast with the service's message.
 *
 * ```ts
 * const addItems = useWorkspaceMutation((services, items: BinderItemInput[]) => services.binder.addItems(items))
 * addItems.mutate(items, { onSuccess: () => toast.success('Added') })
 * ```
 */
export function useWorkspaceMutation<TInput, TResult>(run: (services: Services, input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TInput) => run(await getServices(), input),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}
