/** Transitional re-export of the domain caps; ticket 16 removes it. */
import { ANONYMOUS_RESULT_CAP, STORE_JOIN_CAP } from '#/domain/caps'

export { resultCapFor as tradeResultLimit } from '#/domain/caps'

export const viewerLimits = {
  anonymousTradeResults: ANONYMOUS_RESULT_CAP,
  tradingStores: STORE_JOIN_CAP,
}
