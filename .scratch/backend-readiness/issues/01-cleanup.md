# 01 — Cleanup

Status: ready-for-agent
Blocked by: none

Spec: [../spec.md](../spec.md)

## What

Clear the noise so later phases have working checks and accurate docs.

## Acceptance criteria

- [x] `.output/` is in the `ignores` list in `eslint.config.js` (done on `main` in d9330ca).
- [ ] `pnpm lint` passes. The remaining pre-existing errors are in `src/router.tsx`, `vite.config.ts`, `src/components/LocaleSwitcher.tsx` and the PostHog and React Query provider files.
- [ ] `docs/agents/triage-labels.md` has a `done` row ("Shipped; no further work").
- [ ] `.scratch/trading-shell/issues/01-public-shell.md` and `02-signed-in-area.md` say `Status: done`, and their delivered acceptance checkboxes are ticked.
- [ ] Issue 01's service list matches `src/services/services.ts` (`catalogue`, `places`, `trading`, `community`, `content`, plus the `search` function).
- [ ] Stale notes are removed: "no test runner configured yet" (issue 01) and "Intent ... is not installed" (issue 02).
- [ ] `.scratch/trading-shell/spec.md` lists `/x/settings` in its `/x` table, and its status reflects that the shell shipped.
- [ ] Mock partner auto-accept runs only when `import.meta.env.DEV` is true.
- [ ] Sign-in offers Google and Discord. Apple stays until the owner answers the open question in the spec.

## Notes

No behaviour changes beyond the dev-only auto-accept.
