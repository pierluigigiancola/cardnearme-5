import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getServices } from './services'
import type { Services } from './services'

/**
 * Queries a workspace write can change: every personal query, and the public
 * reads of Traders' data (a new Have shows on the profile, City and Store
 * pages straight away).
 */
const traderDataKeys = [['me'], ['trade-items'], ['city-trade-stats'], ['availability'], ['user'], ['decks'], ['deck']]

/**
 * Mutation hook for workspace writes. On success every query in
 * `traderDataKeys` is refreshed, so pages never show stale data after an
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
    onSuccess: () => Promise.all(traderDataKeys.map(queryKey => queryClient.invalidateQueries({ queryKey }))),
  })
}
