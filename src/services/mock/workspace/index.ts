import type { WorkspaceServices } from '../../services'
import { mockStore } from '../store'
import type { MockStore } from '../store'

import { binderService } from './binder'
import { chatService } from './chat'
import { traderContext } from './context'
import { deckBuilderService } from './decks'
import { listsService } from './lists'
import { notificationsService } from './notifications'
import { profileService } from './profile'
import { seedTrader } from './seed'
import type { WorkspaceOwner } from './seed'
import { tradesService } from './trades'

export type { WorkspaceOwner } from './seed'

/**
 * The signed-in workspace of one Trader, backed by the shared mock store
 * (`../store.ts`). Runs on the server only (see `../rpc.ts`). The Trader is
 * seeded into the store on first access. Mock trading partners are the
 * seeded Traders, and in development they accept proposals on their own
 * after a short delay so every Trade state can be exercised from one account.
 */
export function workspaceFor(owner: WorkspaceOwner, store: MockStore = mockStore): WorkspaceServices {
  const trader = store.traders.get(owner.id) ?? seedTrader(store, owner)
  const ctx = traderContext(store, trader)
  return {
    binder: binderService(ctx),
    chat: chatService(ctx),
    deckBuilder: deckBuilderService(ctx),
    lists: listsService(ctx),
    notifications: notificationsService(ctx),
    profile: profileService(ctx),
    trades: tradesService(ctx),
  }
}
