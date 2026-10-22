# 03 — Domain module

Status: ready-for-agent
Blocked by: 02 (lands together with it)

Spec: [../spec.md](../spec.md) · ADRs: [0001](../../../docs/adr/0001-domain-rules-in-typescript-server-functions.md), [0002](../../../docs/adr/0002-one-record-per-owned-card.md), [0003](../../../docs/adr/0003-trade-completes-on-mutual-confirmation.md)

## What

Create `src/domain/`: pure TypeScript with no imports from React, `src/services/mock/` or Supabase. It holds every trading rule, so the mock (phase 04) and the future server functions run the same code. Write it test-first; the `tdd` skill fits.

## Acceptance criteria

- [ ] **Trade lifecycle:** propose, counter-offer, accept, cancel and confirm, with the current rule that `awaiting` is the side that didn't make the latest offer. Either side may cancel a pending or accepted Trade until both have confirmed. A Trade never completes on its own.
- [ ] **Completion:** when the second confirmation arrives, it returns the Binder changes for both Traders together. Given cards leave the giver's Collection, including their for-trade and reserved quantities. Received cards join the receiver's Collection.
- [ ] **Reservation:** accepting is refused when it would need more copies than owned minus already reserved. Pending proposals reserve nothing.
- [ ] **Want fulfilment:** a received Printing reduces a Want only if it meets every filter the Want sets. An unfiltered Want accepts any Printing of its Card.
- [ ] **Matching:** a Have on a public List matches a Want of another Trader in the same City. Private Lists never expose their owner to others, but the owner's own Matches use all their Wants. Shared Stores only filter or rank.
- [ ] **Trade eligibility:** proposing is refused in a City that hasn't unlocked. Traders in different Cities may trade.
- [ ] **What you may give:** a Trader may add any Collection entry of their own to their side, but may pick only the partner's Haves.
- [ ] **Caps:** the store-join cap and the anonymous result cap (moved from `src/auth/limits.ts`, which becomes a thin re-export or is removed).
- [ ] **Trade value:** one function; the copies in `src/lib/tradeMath.ts`, `src/services/mock/workspace.ts` and `TradeBuilder.tsx` call it.
- [ ] Every rule above has unit tests, and `pnpm test` passes.
