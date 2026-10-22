# 02 — Signed-in area (`/x/*`)

Status: done
Blocked by: 01
Spec: [../spec.md](../spec.md)

## What

Build the signed-in workspace on top of ticket 01's shell, auth guard and mock
services. Ticket 01 already ships the `/x` guard and placeholder pages for every
route below; this ticket fills them in.

## Observed reference behaviour (lootstack.app, signed in, 2026-10-18)

Evidence: REA scenario captures of each page (accessibility tree + screenshots) and
`analyze_web_bundle` over the signed-in store and chat pages (records
`ev_8716429…`, `ev_5936aa3…`). Nothing was submitted; trades/messages were only viewed.

- **Header (signed in):** Find cards, Binder, Cards, Scanner, search, Inbox, user menu (avatar).
- **`/x/binder`** — tabs *Haves (n) · Wants (n) · Collection (n)*. Each section shows a stats
  block (market value, cards, distinct), list chips (*All Haves*, one chip per list,
  *+ New list*, *Manage lists*), actions (*Add to Haves*, *Import*, *Share Haves*), search,
  filters drawer, sort (name A–Z/Z–A, recently/least recently changed, price high/low,
  most/fewest copies). Grid of card tiles with list badge, condition, language, finish,
  price, "In trade" marker and a per-item actions menu.
  Collection section adds a facet sidebar: trade status (in trade), list status
  (listed/unlisted), sets, artist, types, condition, language…
- **`/x/binder/import?section=`** — CSV / pasted list import wizard (`step`, `importId`).
- **`/x/lists`** — table: List, Type (haves/wants), Game, Cards, Visibility (public/private),
  Updated, Actions; search, sort (name / created / updated), order, *Add list*.
- **`/x/decks`** — empty state "Build your first deck" + feature cards (owned counts,
  share builds, multi-game). Deck builder behind *Create deck*.
- **`/x/stores` → `/x/stores/:slug`** — tabs for each joined store; store settings;
  same locked/unlocked content as the public store page plus *Invite traders*.
- **`/x/inbox`, `/x/inbox/:chatId`** — chat list (avatar, name, trade status pill,
  presence, last message) + conversation: partner header (presence, "Trades at" stores),
  *View trade*, *Matches*, message list with timestamps, composer.
- **Trade card (in chat):** status (Pending…), meetup (*Meet at X*, store or custom place),
  *You give* / *You get* columns (card thumb, condition, language, finish, price, market price),
  cash balance line, *Your total* vs *their total* with difference, "Awaiting @user".
- **Trade builder (modal, from a Trade button or Matches):** two sides pre-filled from
  matched items that satisfy wants, quantity steppers, cash balance, location picker
  (shared stores or custom place), meeting date/time, optional note; sending posts the
  proposal into the chat. Completing a trade moves cards between lists and collection.
- **`/x/notifications`** — counters (total, messages, trades, items available, items
  wanted), type tabs (All, Messages, Trades, Items available, Items wanted), status tabs
  (All, Unread, Read), list of notification rows.
- **`/x/onboarding`** — welcome, city picker, store selection (max 5 "trading locations")
  with map, "show my stores on my profile" toggle, *Continue*.
- **Store/city pages when signed in:** *Matches* section first, *Join store*, haves/wants
  previews (8 of N) with *View all*; wants show minimum condition.

## Acceptance criteria

- [x] `/x/onboarding`: city, stores (max 5), profile visibility toggle; sets `onboarded`.
- [x] `/x/binder` with the three sections, list chips, stats, search, sort, facets, add-card
      modal (printing, condition, finish, language, quantity), item actions, multi-select.
- [x] `/x/binder/import`: CSV / pasted-list import wizard with preview and confirm.
- [x] `/x/lists`: list table, create / rename / visibility / delete.
- [x] `/x/decks` + deck builder (add cards, sections, format validation, import/export text).
- [x] `/x/stores/$store`: joined-store tabs, store settings, invite.
- [x] `/x/inbox` + `/x/inbox/$chatId`: chat list, conversation, composer.
- [x] Trade builder modal + trade card in chat with pending / accepted / completed / cancelled states.
- [x] `/x/notifications` with type and status filters.
- [x] `/x/settings`: profile, games, pricing source (Cardmarket EUR / TCGplayer USD).
- [x] New service interfaces (`binder`, `lists`, `chat`, `trades`, `notifications`, `profile`)
      with mock implementations, following ticket 01's pattern.

## Comments

### 2026-10-18 — implementation notes (uncommitted on `feat/experimentation`)

Delivered: every `/x` route is a working page on new workspace services —
`/x/onboarding` (city → up to 5 stores via list or map pins → profile toggle),
`/x/binder` (Haves/Wants/Collection tabs with counts, stats, list chips, new list,
search/sort/view, filters drawer + Collection facet sidebar incl. trade/list status,
add-card dialog, per-item menu, multi-select move/delete), `/x/binder/import`
(paste or CSV → preview with manual matching → confirm; `step` + `importId` in the URL),
`/x/lists` (table, create/edit/visibility/delete), `/x/decks` + `/x/decks/$deckId`
(builder with sections, owned counts, simplified format validation, text import/export),
`/x/stores` → `/x/stores/$store` (joined-store tabs, matches, haves/wants previews,
settings, invite), `/x/inbox` + `/x/inbox/$chatId` (list, conversation, composer),
`/x/notifications` (counters, type + read filters), `/x/settings` (profile, games,
pricing source, city/stores/meeting places). Trade builder modal (`TradeBuilderProvider`
in the root) and the chat trade card with pending/accepted/completed/cancelled states,
accept/decline/counter/edit/withdraw/complete; completing moves cards between sections.

Services: `binder`, `lists`, `deckBuilder`, `chat`, `trades`, `notifications`, `profile`
interfaces in `src/services/services.ts` (types in `types.ts`, query options in
`queries.ts` keyed `['me', viewerId, …]`, writes via `useWorkspaceMutation` in
`services/mutations.ts`). The mock (`services/mock/workspace.ts`) keeps per-user state
in **server memory**, seeded from the viewer id, behind one server function
(`mock/workspaceRpc.ts`) that resolves the viewer from the session and rejects anonymous
calls — so data survives reloads and SSR matches the client. Mock partners accept your
proposals ~20 s after you send them. Facet helpers moved to `mock/queryHelpers.ts`.

Wired: Trade buttons (builder pre-filled with the card + matches), card page "Add to…"
(+ real ownership counts), profile Message/Trade, public store "Join store", city
Matched page, signed-in header (Binder link, Inbox badge), workspace sub-nav.
Auth: demo users now go through onboarding too (`cnm-demo-onboarded` cookie); gated
actions send non-onboarded users to onboarding and back. Pricing source drives `Price`.

Verified: `tsc --noEmit` clean for `src/`; `eslint src` only reports files unchanged
from HEAD (LocaleSwitcher, router.tsx, integrations/posthog/provider.tsx,
integrations/tanstack-query/root-provider.tsx); `pnpm build` passes and the mock store is
not in the client bundle. Clicked through every flow in demo mode, and in Supabase mode
(local stack, `dev-supabase` launch config on :3102) sign-up → onboarding → all `/x`
routes return 200, unknown deck/chat/store → 404.

Not done / follow-ups:
- Mock state is in-memory: a dev-server restart or an edit to `mock/workspace.ts` re-seeds it.
- Prices: mock has one price per finish, so USD only changes the currency symbol; public
  pages briefly show EUR before the profile loads (consider pricing source on the session).
- Trade completion is one-sided; partners' public lists are not updated by trades.
- Your decks are not listed on the community `/decks` pages; deck comments still not persisted.
- Public profile does not reflect your workspace binder or list visibility yet.
- Notifications/chat use polling (5–30 s), no realtime.
- Copy still English-only (Paraglide), no Leaflet map.

### 2026-10-18 — closing

All acceptance criteria verified in the browser (also CSV import, invite dialog and list
rename, which the first pass had not clicked). Before closing:
- Public `/stores/$store` now shows "Your matches" first for signed-in, onboarded traders
  (anonymous view unchanged), per the observed reference behaviour above.
- The deck-comments TODO in `src/routes/decks/$game/$format/$deckId.tsx` is relabelled as a
  follow-up: comments still only show a toast until a comments service exists.

Follow-ups for a new ticket: deck comments service; the open items listed in the previous
comment (unit tests are being added in a separate session).
