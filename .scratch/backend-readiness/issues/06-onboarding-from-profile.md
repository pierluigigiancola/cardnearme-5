# 06: Onboarding from profile.onboardedAt only

**What to build:** Onboarding has one source of truth. Finishing onboarding sets `profile.onboardedAt`, and the `/x` guard reads it on the server, so a Trader who hasn't onboarded is always sent to onboarding and one who has never is, including through the demo sign-in.

**Blocked by:** 03

**Status:** ready-for-agent

Spec: [../spec.md](../spec.md), decision 3

- [ ] `completeOnboarding` is the only place onboarding is recorded, and it sets `profile.onboardedAt`. Its doc comment says so.
- [ ] The `/x` guard reads `profile.onboardedAt` on the server.
- [ ] The `user_metadata.onboarded` write in the onboarding route and the reads in the viewer helper are removed.
- [ ] The demo sign-in path follows the same rule.
- [ ] Tests cover the guard for onboarded and not-onboarded Traders, and `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
