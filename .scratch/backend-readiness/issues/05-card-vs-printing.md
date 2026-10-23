# 05: Card vs Printing

**What to build:** The catalogue contract uses the glossary's split. A **Printing** is one release in a Set, and a **Card** is the game piece that groups the Printings of one name within a Game. Card pages, search and availability work as before, now keyed by the right identity.

**Blocked by:** 03

**Status:** done

Spec: [../spec.md](../spec.md) · Glossary: Card, Printing

- [x] Today's `Card` type (the one with set code and collector number) is renamed `Printing` everywhere.
- [x] A Card identity exists that groups the Printings of one Card within a Game. Wants will target it in 09.
- [x] Service methods take ids, not entities: `listPrintings(cardId)` and `getCardAvailability(cardId)`.
- [x] Mock catalogue data provides the Card grouping.
- [x] UI copy says "Printing" where it means one release.
- [x] Card pages, search and the Binder import still work, and `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
