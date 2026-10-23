# 12: Deck import matches in one call

**What to build:** Importing a deck list resolves every row in one request, using the same matching as the Binder import, instead of searching row by row.

**Blocked by:** 05

**Status:** done

Spec: [../spec.md](../spec.md)

- [x] `catalogue.matchCards(rows)` resolves a whole list in one call. The Binder import and the deck import both use it.
- [x] The deck import goes through `queries.ts`, not direct service calls in the route.
- [x] Unmatched rows are reported to the user, as in the Binder import.
- [x] Tests cover `matchCards`, and `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
