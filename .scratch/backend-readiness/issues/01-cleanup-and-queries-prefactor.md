# 01: Cleanup and queries prefactor

**What to build:** Working checks, accurate docs and a smaller `queries.ts`, so every later slice starts green and doesn't fight over the same boilerplate. Behaviour only changes in one place: mock partners auto-accept in development only.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

Spec: [../spec.md](../spec.md)

- [x] `.output/` is ignored by ESLint (done on `main` in d9330ca).
- [ ] `pnpm lint` passes. The remaining pre-existing errors are in the router, the Vite config, `LocaleSwitcher` and the PostHog and React Query providers.
- [ ] `docs/agents/triage-labels.md` has a `done` row ("Shipped; no further work").
- [ ] The trading-shell issues say `Status: done` and their delivered checkboxes are ticked. Issue 01's service list matches the services that actually exist (`catalogue`, `places`, `trading`, `community`, `content`, plus `search`), and the stale notes ("no test runner configured yet", "Intent ... is not installed") are gone.
- [ ] The trading-shell spec lists `/x/settings` in its `/x` table, and its status says the shell shipped.
- [ ] Mock partner auto-accept runs only when `import.meta.env.DEV` is true.
- [ ] Sign-in offers Google and Discord. Apple stays until the owner answers the open question in the spec.
- [ ] A small helper replaces the repeated `async () => (await getServices()).x.y(...)` wrappers in `queries.ts`, and every query still works.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
