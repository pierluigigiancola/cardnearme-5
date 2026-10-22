# 14: Cookie consent

**What to build:** Visitors choose whether analytics run before PostHog loads, as required before launch.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

Spec: [../spec.md](../spec.md), decision 7

- [ ] A consent banner offers accept and decline with equal prominence.
- [ ] PostHog doesn't load or capture anything until the visitor accepts.
- [ ] The choice persists across visits and can be changed from the footer.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
