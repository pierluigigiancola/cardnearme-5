# 10: City-scoped Matching and locked Cities

**What to build:** Matches work across Traders. A Trader sees other Traders' public Haves in their City that satisfy their Wants, and a Store filter narrows or ranks those Matches. Matches show even before a City unlocks, but "Propose trade" is disabled there with an explanation. Traders in different Cities can still trade with each other.

**Blocked by:** 08, 09

**Status:** ready-for-agent

Spec: [../spec.md](../spec.md), decisions 4–6 · ADR: [0002](../../../docs/adr/0002-one-record-per-owned-card.md)

- [ ] `MatchScope` is City-level, with an optional Store filter.
- [ ] The domain module has a tested matching rule: a Have on a public List matches another Trader's Want in the same City. Your own Matches use all your Wants, including those on private Lists. Shared Stores only filter or rank.
- [ ] The domain module has a tested trade-eligibility rule: proposing is refused in a City that hasn't unlocked, and Traders in different Cities may trade.
- [ ] The propose service method enforces eligibility, and its doc comment says so.
- [ ] The matched page shows Matches whether or not the City has unlocked. In a locked City, "Propose trade" is disabled with an explanation.
- [ ] In the browser, a Have added by one seeded Trader appears as a Match for another Trader in the same City.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
