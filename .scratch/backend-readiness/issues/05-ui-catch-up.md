# 05 — UI catch-up

Status: ready-for-agent
Blocked by: 04

Spec: [../spec.md](../spec.md)

## What

Rewire pages to the new contract and fix the UI findings from the review.

## Acceptance criteria

**New contract**

- [ ] Every page compiles and works against the phase 02 contract, and uses glossary terms in its copy.
- [ ] The Binder shows each owned card once, with its for-trade and reserved quantities.
- [ ] Adding a Want defaults to "any printing", with optional Set, finish, language and minimum-condition filters.
- [ ] A Trade shows each side's confirmation, and the Trader still to confirm sees a "Confirm trade" action.
- [ ] "Propose trade" is disabled with an explanation in a City that hasn't unlocked. Matches still show.

**Review findings**

- [ ] The deck import in `src/routes/x/decks/$deckId.tsx` goes through `queries.ts` and resolves all rows in one call (`catalogue.matchCards(rows)`), reusing the binder import's matching instead of searching row by row.
- [ ] One shared error-state component is used wherever a query falls back to `[]` and ignores `isError`: `city/$city/matched.tsx`, `AddCardDialog.tsx`, `x/decks/$deckId.tsx` and `stores/$store.tsx`. Find others with a search.
- [ ] Deleting a List or a Binder entry asks for confirmation, reusing the deck page's confirm dialog. Deleting a List warns that its items go with it.
- [ ] `LocaleSwitcher` is mounted in the footer.
- [ ] The Buy link on the card page is hidden (see [09](09-buy-link.md)).
- [ ] A small helper removes the repeated `async () => (await getServices()).x.y(...)` wrappers in `queries.ts`.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass, and the main flows are checked in the browser: add a Have, find a Match, propose, accept, confirm on both sides.
