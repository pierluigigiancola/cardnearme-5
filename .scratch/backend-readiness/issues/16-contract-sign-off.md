# 16: Contract sign-off

**What to build:** The contract is ready for the real Supabase backend. The doc comments on the service interfaces describe it fully, no transitional shims remain, and the whole trading flow works end to end in the browser.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13

**Status:** ready-for-agent

Spec: [../spec.md](../spec.md), "Done when"

- [ ] The service interfaces and their doc comments match `GLOSSARY.md`, the ADRs and the spec's decisions.
- [ ] The re-exports left behind for the old limits and trade-math helpers are removed, and callers import from the domain module.
- [ ] Every domain rule in the mock goes through the domain module. A search finds no trading rules left in the mock services.
- [ ] Browser walkthrough with two seeded Traders: add a Have, see it as the other Trader's Match, propose, accept, confirm on both sides, and see both Binders updated.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
