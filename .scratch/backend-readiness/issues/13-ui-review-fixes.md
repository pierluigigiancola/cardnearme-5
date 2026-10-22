# 13: UI review fixes

**What to build:** The UI findings from the code review that don't depend on the contract. Failed queries show an error instead of looking empty, deleting a Binder entry asks first, the locale switcher can be reached, and the dead Buy link is hidden.

**Blocked by:** 01

**Status:** ready-for-agent

Spec: [../spec.md](../spec.md)

- [ ] One shared error-state component is used wherever a query falls back to `[]` and ignores `isError`. Known cases are the City matched page, the add-card dialog, the deck editor and the Store page. Search for others.
- [ ] Deleting a Binder entry asks for confirmation, reusing the deck page's confirm dialog.
- [ ] `LocaleSwitcher` is mounted in the footer.
- [ ] The Buy link on the card page is hidden (see [17](17-buy-link.md)).
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
