# 13: UI review fixes

**What to build:** The UI findings from the code review that don't depend on the contract. Failed queries show an error instead of looking empty, deleting a Binder entry asks first, the locale switcher can be reached, and the dead Buy link is hidden.

**Blocked by:** 01

**Status:** done

Spec: [../spec.md](../spec.md)

- [x] One shared error-state component is used wherever a query falls back to `[]` and ignores `isError`. Known cases are the City matched page, the add-card dialog, the deck editor and the Store page. Search for others.
- [x] Deleting a Binder entry asks for confirmation, reusing the deck page's confirm dialog.
- [x] `LocaleSwitcher` is mounted in the footer.
- [x] The Buy link on the card page is hidden (see [17](17-buy-link.md)).
- [x] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.

## Comments

- Shared `ErrorState` lives in `src/components/layout/ErrorState.tsx` (`compact` for lists, popovers and dialogs). Used on the City matched page, the add-card dialog (search, printings, lists; Add is disabled when lists fail), the deck editor (ownership), the Store page (membership), plus card search box, global search, Swap calculator search, onboarding stores and the card page's copy counts.
- Binder entry removal already asked first; the three ad-hoc dialogs (single remove, bulk delete, deck delete) and the List delete dialog now share `src/components/workspace/ConfirmDialog.tsx`.
