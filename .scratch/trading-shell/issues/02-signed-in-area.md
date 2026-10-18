# 02 — Signed-in area (`/x/*`)

Status: ready-for-agent
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

- [ ] `/x/onboarding`: city, stores (max 5), profile visibility toggle; sets `onboarded`.
- [ ] `/x/binder` with the three sections, list chips, stats, search, sort, facets, add-card
      modal (printing, condition, finish, language, quantity), item actions, multi-select.
- [ ] `/x/binder/import`: CSV / pasted-list import wizard with preview and confirm.
- [ ] `/x/lists`: list table, create / rename / visibility / delete.
- [ ] `/x/decks` + deck builder (add cards, sections, format validation, import/export text).
- [ ] `/x/stores/$store`: joined-store tabs, store settings, invite.
- [ ] `/x/inbox` + `/x/inbox/$chatId`: chat list, conversation, composer.
- [ ] Trade builder modal + trade card in chat with pending / accepted / completed / cancelled states.
- [ ] `/x/notifications` with type and status filters.
- [ ] `/x/settings`: profile, games, pricing source (Cardmarket EUR / TCGplayer USD).
- [ ] New service interfaces (`binder`, `lists`, `chat`, `trades`, `notifications`, `profile`)
      with mock implementations, following ticket 01's pattern.

## Comments
