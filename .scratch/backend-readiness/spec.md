# Spec: Backend readiness

Status: ready-for-agent

## Goal

Get the front-end shell built in `.scratch/trading-shell/` ready for a real backend. A code review of `feat/experimentation` against `main` found that the service contract, the mock and some pages encode rules the backend can't honour: limits decided by the browser, the same owned card recorded twice, usernames used as foreign keys, and trade completion that changes the partner's Binder without them acting. This effort fixes the contract and moves the rules into one shared domain module, so the real Supabase backend can be built against a contract that won't change under it.

Work on a new branch off `main`, which now contains the shell (suggested name: `feat/backend-readiness`).

Out of scope: the real Supabase backend itself (tables, RLS, server functions against the database), sourcing card data, pricing feeds, payments.

## Language and decisions

Use the vocabulary in [`GLOSSARY.md`](../../GLOSSARY.md) for type names, function names, UI copy and comments. Note in particular that the glossary separates **Card** (the game piece, by name) from **Printing** (one release in a Set). The current `Card` type in `src/services/types.ts` is a Printing.

The architecture decisions are recorded as ADRs. Read them before starting; the issues refer to them rather than repeating the reasoning:

- [ADR 0001](../../docs/adr/0001-domain-rules-in-typescript-server-functions.md): domain rules live in a pure TypeScript module run by server functions.
- [ADR 0002](../../docs/adr/0002-one-record-per-owned-card.md): one record per owned card; Haves are Collection entries marked for trade; Lists hold visibility; Wants target a Card with optional filters; Collections are private.
- [ADR 0003](../../docs/adr/0003-trade-completes-on-mutual-confirmation.md): a Trade completes only when both Traders confirm; accepting reserves cards.

## Further decisions (no ADR)

These are settled but easy to reverse, so they live here:

1. **Traders are identified by a `UserId`** (the Supabase auth user id) wherever data refers to a person. Usernames are for display and URLs only.
2. **The anonymous result cap is decided by the server** from the session. A `limit` sent by the client is for paging only and is clamped to the cap; the response says whether results were capped (`cappedAt`).
3. **Onboarding has one source of truth: `profile.onboardedAt`**, set inside `completeOnboarding`. The `/x` guard reads it on the server. The `user_metadata.onboarded` flag is removed.
4. **Matching is scoped to the City.** Shared Stores rank or filter Matches; they don't define them.
5. **Matches are shown before a City unlocks**; only proposing a Trade is locked until then.
6. **Traders in different Cities may trade.** The City limits who finds whom, not who may trade.
7. **Cookie consent** is required before launch, because PostHog is in the app. "What's new" and the card details dialog are deferred.
8. **Gated stubs** (deck comments, like, Buy link, contact form) get one issue each and are built with the backend. The Buy link is hidden until a pricing or affiliate source exists.
9. **Mock partners auto-accept** proposals (and, after this effort, auto-confirm Trades) in development only. Sign-in providers: keep Google and Discord.
10. **Issue tracker:** add a `done` label to `docs/agents/triage-labels.md` for shipped issues.

## Open question for the owner

- **Apple sign-in:** keep it only if an iOS scanner app is planned, because Apple requires Sign in with Apple on iOS apps that offer other social sign-ins. Until the owner answers, leave it in place.

## Phases

Each phase is one issue and one commit (or a small series) with tests passing. They run in order; each depends only on the ones before it.

| # | Issue | Depends on |
|---|---|---|
| 01 | [Cleanup](issues/01-cleanup.md) | — |
| 02 | [Service contract](issues/02-service-contract.md) | 01 |
| 03 | [Domain module](issues/03-domain-module.md) | 02 (lands together with it) |
| 04 | [Mock on one store](issues/04-mock-one-store.md) | 03 |
| 05 | [UI catch-up](issues/05-ui-catch-up.md) | 04 |
| 06 | [Cookie consent and copy check](issues/06-consent-and-copy.md) | 05 |

Phase 02 changes the types, so the app won't build until phase 03's module and the first call sites exist. Land 02 and 03 together, or keep 02 on the branch until 03 compiles.

Stub features, built with the backend (not part of the phases):

- [Deck comments](issues/07-deck-comments.md)
- [Deck likes](issues/08-deck-likes.md)
- [Buy link](issues/09-buy-link.md)
- [Contact form](issues/10-contact-form.md)

## Done when

- `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` all pass.
- The service interfaces in `src/services/` match `GLOSSARY.md`, the ADRs and the decisions above, and their doc comments describe that contract.
- The mock runs every domain rule through `src/domain/`, so the real backend can call the same module.
