# 16: Contract sign-off

**What to build:** The contract is ready for the real Supabase backend. The doc comments on the service interfaces describe it fully, no transitional shims remain, and the whole trading flow works end to end in the browser.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13

**Status:** done

Spec: [../spec.md](../spec.md), "Done when"

- [x] The service interfaces and their doc comments match `GLOSSARY.md`, the ADRs and the spec's decisions.
- [x] The re-exports left behind for the old limits and trade-math helpers are removed, and callers import from the domain module.
- [x] Every domain rule in the mock goes through the domain module. A search finds no trading rules left in the mock services.
- [x] Browser walkthrough with two seeded Traders: add a Have, see it as the other Trader's Match, propose, accept, confirm on both sides, and see both Binders updated.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.

## Comments

**Implementer (ticket/16):**

- Shims removed: `src/auth/limits.ts` and `src/lib/tradeMath.ts` had no callers left; callers import from `#/domain`.
- Gap from 11 (Binder could lower `quantity` below reserved copies or delete a reserved entry, so completion gave fewer copies than promised). Judged a domain rule the contract must hold: the glossary defines Reserved quantity as part of a Collection entry promised in accepted Trades, and ADR 0003 says acceptance reserves cards. Fixed with `checkOwnedQuantity(quantity, reserved)` in `src/domain/reservation.ts`. `binder.updateItem` refuses fewer owned copies than reserved, and `binder.removeItems` refuses the whole selection if any entry has reserved copies ("cancel them first"). The Binder steppers now stop at the reserved count. Lowering `forTradeQuantity` stays allowed, because the giver may give any owned copy (ADR 0002).
- Trading rules still inline in the mock were moved to `src/domain/tradeTerms.ts`: `checkTradePartner` (no trade or chat with yourself), `checkTradeParties` (at least one card), and `tradeCash` (rounding to cents, positive amount, payer). The checks left in the mock validate input (Set, finish, condition and language values, List type and Game, meetup and note text, import state). They are not trading rules.
- Doc comments added to `updateItem`, `removeItems`, `getContext`, `joinStore` and `BinderItemPatch.quantity`. The rest of `services.ts` and `types.ts` already matched the glossary and ADRs.
- Browser walkthrough (worktree dev server, demo `alicetest` + `bobtest`, both onboarded to Milan):
  1. bob added a Sworn Crown Have, and it showed under bobtest on alice's /city/milan--italy/matched.
  2. alice proposed Silent Covenant for Sworn Crown, and bob accepted. Alice's Silent Covenant then showed "1 reserved".
  3. bob confirmed, then alice confirmed, and the Trade read "Completed".
  4. alice's Binder had Silent Covenant ×3 → ×2 and gained Sworn Crown ×1. bob's Binder lost Sworn Crown and gained Silent Covenant ×1.

  DEV auto-accept and auto-confirm never fired. Each step ran within the 20s `PARTNER_REPLY_MS`, and bob confirmed straight after accepting, so his session had nothing to auto-confirm for alice.
