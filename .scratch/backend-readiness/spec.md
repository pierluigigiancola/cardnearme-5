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

## Tickets

Each ticket is a vertical slice: it changes the contract, the domain module, the mock and the UI for one rule, and lands with `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` passing. Any ticket whose blockers are all done can start.

| # | Ticket | Blocked by |
|---|---|---|
| 01 | [Cleanup and queries prefactor](issues/01-cleanup-and-queries-prefactor.md) | — |
| 02 | [Domain module, starting with trade value and caps](issues/02-domain-module-trade-value-and-caps.md) | 01 |
| 03 | [One mock store](issues/03-one-mock-store.md) | 01 |
| 04 | [Traders identified by UserId](issues/04-traders-identified-by-userid.md) | 03 |
| 05 | [Card vs Printing](issues/05-card-vs-printing.md) | 03 |
| 06 | [Onboarding from profile.onboardedAt only](issues/06-onboarding-from-profile.md) | 03 |
| 07 | [Haves are Collection entries](issues/07-haves-are-collection-entries.md) | 02, 03 |
| 08 | [Lists hold visibility](issues/08-lists-hold-visibility.md) | 07 |
| 09 | [Wants target a Card with filters](issues/09-wants-target-a-card.md) | 05, 08 |
| 10 | [City-scoped Matching and locked Cities](issues/10-city-scoped-matching.md) | 08, 09 |
| 11 | [Trades complete on mutual confirmation](issues/11-mutual-confirmation-and-reservation.md) | 04, 07 |
| 12 | [Deck import matches in one call](issues/12-deck-import-batch-matching.md) | 05 |
| 13 | [UI review fixes](issues/13-ui-review-fixes.md) | 01 |
| 14 | [Cookie consent](issues/14-cookie-consent.md) | — |
| 15 | [Help, FAQ and scanner copy check](issues/15-copy-check.md) | — |
| 16 | [Contract sign-off](issues/16-contract-sign-off.md) | 01–13 |

02 and 03 can run in parallel, but both edit the mock workspace, so expect a merge.

Stub features, built later (not part of this effort's done-when):

- [Buy link](issues/17-buy-link.md): blocked by 13 and a pricing or affiliate source
- [Deck comments](issues/18-deck-comments.md): blocked by the real backend
- [Deck likes](issues/19-deck-likes.md): blocked by the real backend
- [Contact form](issues/20-contact-form.md): blocked by the choice of email provider

## Done when

- `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` all pass.
- The service interfaces in `src/services/` match `GLOSSARY.md`, the ADRs and the decisions above, and their doc comments describe that contract.
- The mock runs every domain rule through `src/domain/`, so the real backend can call the same module.
