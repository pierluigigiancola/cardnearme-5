# 01 — App shell and public pages

Status: ready-for-agent
Spec: [../spec.md](../spec.md)

## What

Build the app chrome and every public route from the spec on TanStack Start, backed
by a mock service layer. Anonymous gating and the sign-in/sign-up pages (Supabase
email+password) are part of this ticket.

## Acceptance criteria

- [ ] Root layout: header (nav, global search, theme toggle, auth buttons / avatar menu),
      mobile drawer, footer, toaster. Dark theme by default, light theme supported.
- [ ] Service layer in `src/services/` with typed interfaces (`catalogue`, `trading`,
      `stores`, `decks`, `users`, `content`) and a mock implementation (faker, deterministic
      seed). Pages only talk to services through React Query query options.
- [ ] Viewer model: `useViewer()` returns anonymous or signed-in (Supabase session);
      `AuthGate` renders a sign-up prompt for anonymous users; `viewerLimits` holds the
      anonymous cap (30 results on city haves/wants).
- [ ] Routes render with mock data: `/`, `/find-cards` (redirect), `/city`, `/city/$city`,
      `/city/$city/haves|wants|matched`, `/stores`, `/stores/$store`, `/sets`, `/sets/$game`,
      `/sets/$game/$set`, `/sets/$game/$set/sealed`, `/sets/$game/$set/$card/$number`,
      `/decks`, `/decks/$game`, `/decks/$game/$format`, `/decks/$game/$format/$deckId`,
      `/users/$username`, `/swap-calculator`, `/scanner`, `/help`, `/help/$topic`,
      `/changelog`, `/about`, `/contact`, `/privacy`, `/sign-in`, `/sign-up`.
- [ ] Gated actions on public pages (Add to…, Trade, Message, comments, matches, price
      chart, ownership) show the sign-up prompt when anonymous and keep a `redirect` back.
- [ ] Deck detail includes working opening-hand simulator and hypergeometric draw odds
      (pure functions, unit-testable).
- [ ] Swap calculator works client-side against the mock catalogue.
- [ ] Global search (`/` shortcut) over cards and cities; Cmd/Ctrl+K command palette.
- [ ] `pnpm build` passes and `tsc --noEmit` is clean.

## Not in this ticket

Maps (render a placeholder; Leaflet comes with real store data), real card data,
price history charts, iOS scanner.

## Comments

### 2026-10-18 — implementation notes (uncommitted on `feat/experimentation`)

Delivered: all routes above render against `src/services/mock` (seeded PRNG, no
faker in the client bundle); `src/services/services.ts` is the swap point
(`setServices(realImpl)`); `src/services/queries.ts` holds every query option.
Auth: `src/auth/viewer.ts` reads the Supabase session server-side; with no
`SUPABASE_URL`/`SUPABASE_ANON_KEY` (and `VITE_` twins) a **dev-only** demo
sign-in (username cookie) is used so both viewer states can be exercised.
Anonymous cap lives in `src/auth/limits.ts`. `/x/*` is guarded and every
ticket 02 page exists as a placeholder.

Verified: `tsc` clean for `src/`, `eslint` clean for new code, `pnpm build`
passes, SSR crawl of every route type returns 200/307/404 as expected, manual
check of facets, table view, gated Trade dialog, demo sign in/out.

Not done / follow-ups:
- Unit tests for `src/lib/deckMath.ts` and the facet helpers (no test runner configured yet).
- Copy is English-only; not yet moved into Paraglide messages.
- Store map is a lightweight placeholder (no Leaflet / tiles).
- `.env.local` has a placeholder PostHog key (`phc_xxx`) → PostHog requests 401.
- `src/supabase/database.types.ts` is a placeholder until `pnpm supabase:local:types` runs.
- ESLint: `sort-keys` disabled for `src/routes/**` (conflicts with
  `@tanstack/router/create-route-property-order`, which route type inference
  needs) and for shadcn `src/components/ui/**`.
- Port 3000 was taken by another local project; `.claude/launch.json` uses 3100.
