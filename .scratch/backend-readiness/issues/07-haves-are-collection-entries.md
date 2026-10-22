# 07: Haves are Collection entries

**What to build:** Each owned card is recorded once (ADR 0002). A Trader's Binder shows each Collection entry once, with how many copies they own and how many are for trade. Marking copies for trade makes them a Have, which appears on public pages. Other Traders see Haves only, never the rest of the Collection. In the Trade builder you can add any card from your own Collection to your side, but only the partner's Haves to theirs.

**Blocked by:** 02, 03

**Status:** ready-for-agent

Spec: [../spec.md](../spec.md) · ADR: [0002](../../../docs/adr/0002-one-record-per-owned-card.md)

- [ ] A Collection entry has a quantity and a for-trade quantity (≤ quantity). A Have is a Collection entry with a for-trade quantity above zero.
- [ ] The `listed` flag is gone. `BinderSection`, the TradeItem list type and the Binder item section no longer describe the same concept twice.
- [ ] Public listing types are read projections of Collection entries. No separate Have records are stored.
- [ ] `TradeLine.sourceId` always refers to a Collection entry, on either side.
- [ ] The domain module holds the rule for what you may give: any of your own Collection entries, but only the partner's Haves. It has unit tests.
- [ ] The Binder UI edits quantity and for-trade quantity on one row. Binder import and onboarding create Collection entries.
- [ ] Marking a card for trade in the Binder shows it on your public profile and City pages, and unmarking it removes it.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
