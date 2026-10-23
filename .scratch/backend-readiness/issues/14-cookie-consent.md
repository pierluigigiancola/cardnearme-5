# 14: Cookie consent

**What to build:** Visitors choose whether analytics run before PostHog loads, as required before launch.

**Blocked by:** None (can start immediately)

**Status:** done

Spec: [../spec.md](../spec.md), decision 7

- [x] A consent banner offers accept and decline with equal prominence.
- [x] PostHog doesn't load or capture anything until the visitor accepts.
- [x] The choice persists across visits and can be changed from the footer.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.

## Comments

- The consent rules live in `src/lib/consent.ts`, with tests in `consent.test.ts`. `src/integrations/posthog/provider.tsx` calls `posthog.init` only after the visitor accepts, and exposes `useConsent()`. The banner is `src/components/layout/ConsentBanner.tsx`, and the footer has a "Cookie settings" button that reopens it.
