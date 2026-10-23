# 09: Wants target a Card with filters

**What to build:** A Trader wants a Card, not a specific Printing, unless they choose to narrow it. Adding a Want defaults to "any printing", with optional Set, finish, language and minimum-condition filters. When a Trade completes, a received Printing reduces a Want only if it meets every filter the Want sets.

**Blocked by:** 05, 08

**Status:** done

Spec: [../spec.md](../spec.md) · ADR: [0002](../../../docs/adr/0002-one-record-per-owned-card.md) · Glossary: Want

- [x] A Want targets a Card id, with optional filters for Set, finish, language and minimum condition. An unset filter means "any".
- [x] The domain module has a tested Want-fulfilment rule: an unfiltered Want accepts any Printing of its Card, and every filter that is set is binding.
- [x] Trade completion applies the fulfilment rule to the receiver's Wants.
- [x] The add-Want UI defaults to "any printing" and shows the optional filters. The Binder shows each Want's filters.
- [x] Binder import and onboarding create Card-level Wants.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
