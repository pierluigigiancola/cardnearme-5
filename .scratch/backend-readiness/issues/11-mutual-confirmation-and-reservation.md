# 11: Trades complete on mutual confirmation

**What to build:** Nobody's Binder changes without their own action (ADR 0003). Accepting a Trade reserves its cards, and the Binder shows reserved quantities. Each Trader then confirms the Trade happened, and the Trade shows who has confirmed. The Trader still to confirm sees a "Confirm trade" action. When the second confirmation arrives, the Trade becomes Completed and both Binders update in that one step. Either Trader can cancel until both have confirmed.

**Blocked by:** 04, 07

**Status:** ready-for-agent

Spec: [../spec.md](../spec.md), decision 9 · ADR: [0003](../../../docs/adr/0003-trade-completes-on-mutual-confirmation.md)

- [ ] The Trade lifecycle lives in the domain module: propose, counter-offer, accept, cancel and confirm. `awaiting` is the side that didn't make the latest offer. A Trade never completes on its own.
- [ ] Reservation: a Collection entry has a reserved quantity. Accepting is refused when it would need more copies than owned minus already reserved. Pending proposals reserve nothing.
- [ ] Completion returns the Binder changes for both Traders together. Given cards leave the giver's Collection, including their for-trade and reserved quantities, and received cards join the receiver's Collection.
- [ ] `Trade` records a confirmation timestamp for each Trader. `trades.complete` becomes `trades.confirm`, and its doc comment describes mutual confirmation.
- [ ] The `inTrade` flag is gone, replaced by reserved quantity.
- [ ] The Trade UI shows each side's confirmation and offers "Confirm trade" to the Trader still to confirm. The Binder shows reserved quantities.
- [ ] In development only, mock partners auto-confirm accepted Trades after a short delay.
- [ ] Every rule has unit tests, and `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
