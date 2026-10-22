# 08: Lists hold visibility

**What to build:** Visibility is set only on Lists (ADR 0002). Every Have and Want belongs to exactly one List, and each Trader starts with a default Haves List and a default Wants List. Making a List private hides its contents from other Traders on every public page. Deleting a List asks for confirmation and warns that its items go with it.

**Blocked by:** 07

**Status:** ready-for-agent

Spec: [../spec.md](../spec.md) · ADR: [0002](../../../docs/adr/0002-one-record-per-owned-card.md)

- [ ] Each Have and Want has a non-nullable `listId`.
- [ ] Every Trader has a default Haves List and a default Wants List. New Traders get them, and seed data is migrated into them.
- [ ] Visibility exists only on `List`. Any per-item visibility is removed.
- [ ] Public projections include only items on public Lists, and the domain module has a tested rule for it.
- [ ] Making a List private hides its items from your public profile and from City and Store pages. They still show in your own Binder.
- [ ] Deleting a List asks for confirmation, reusing the deck page's confirm dialog, and warns that its items go with it.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
