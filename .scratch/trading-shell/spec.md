# Spec: CardNearMe trading shell (modelled on lootstack.app)

Status: done

The shell shipped (tickets 01 and 02). Backend work continues in `.scratch/backend-readiness/`.

## Goal

Ship the front-end shell of a local TCG trading app — the same feature surface as
lootstack.app — on our stack (TanStack Start + React Query + Supabase + shadcn/Tailwind).
Every page renders against a **service interface** backed by mock data, so real
services (card catalogue, pricing, trading, chat) can be plugged in later without
touching the UI.

Out of scope for the shell: sourcing card data, pricing feeds, matching engine,
the iOS scanner itself, payments.

## How this spec was produced

Reverse-engineered on 2026-10-18 from the live site (anonymous browsing + REA
`analyze_web_bundle` over the shipped JS bundle and its public source maps).
Evidence: REA record `ev_1260fa0f…` (home bundle analysis), sitemap index, robots.txt.

Observed reference stack: Next.js (Turbopack), Clerk auth, React Query, Zustand,
nuqs (URL state), cmdk (command palette), downshift (autocomplete), sonner (toasts),
react-hotkeys-hook, Leaflet maps, PostHog, Termly CMP.

We copy **features, routes and information architecture**, not their source code,
copy text, branding or assets.

## Domain vocabulary (observed)

- **Game** — a supported TCG: MTG, Riftbound, One Piece, Star Wars: Unlimited, Lorcana,
  Dragon Ball Super Fusion World, Flesh and Blood. Each game has capabilities
  (catalogue, trading, deck builder, legalities, scanner) and pricing variants
  (Cardmarket EUR / TCGplayer USD).
- **Set** — a release within a game (code, name, type, release date, card count, market cap).
- **Card / Printing** — a specific printing in a set (collector number, rarity, finishes,
  languages, price). Card URL: `/sets/:game/:set/:cardSlug/:number[/:variant]`.
- **Sealed product** — booster/box/bundle within a set.
- **Collection** — cards a user owns.
- **Trade list** — a user's **Haves** (offered) or **Wants** (looking for) list.
- **Binder** — the signed-in view combining Collection, Haves and Wants (`section=` param).
- **LGS (local game store)** — a physical store; users join stores where they trade.
- **City** — trading hub; **trading unlocks** once a city reaches a trader threshold (e.g. 3).
- **Match** — a card on someone's Haves that is on your Wants (and vice versa), at stores you share.
- **Trade proposal** — negotiated in-person trade: cards both sides, cash balance, meetup, accept.
- **Deck** — game + format deck list, public or private, with comments.

## Information architecture

### Public (anonymous allowed)

| Route | Page | Anonymous behaviour |
|---|---|---|
| `/` | Landing: hero, city trading teaser (detected city, game chips, nearby stores, unlock progress), app promo, how-it-works, community decks, news feed, why-local, FAQ, CTA | full |
| `/find-cards` | Redirects to `/city/:detectedCity` | full |
| `/city` | City index | full |
| `/city/:slug` | City hub. Locked: progress to threshold, what unlocks, how to help. Unlocked: stats (traders, trades, stores), Haves / Wants / Matched entry cards, store map + list, invite | full |
| `/city/:slug/haves` | Browse cards offered in city: search, view (table/visual), sort, facet filters, card grid with Trade buttons | **capped at 30 results**, sign-up promo panel |
| `/city/:slug/wants` | Same for wanted cards | capped at 30 |
| `/city/:slug/matched` | Matches between my lists and city | sign-in wall |
| `/stores` | Store finder: city search, list ranked by traders, map | full |
| `/stores/:slug` | Store page: traders, locked/unlocked trading state, join store, map, address, website, claim page | join requires auth |
| `/sets` | Games grid with set counts | full |
| `/sets/:game` | Set table: search card / set, sort (name, code, release, cards, market cap) | full |
| `/sets/:game/:set` | Set card list: facet filters (artist, type, finish, rarity, cost, price, colors…), table/visual, format filter, sort; sealed link; sign-up promo | full |
| `/sets/:game/:set/sealed` | Sealed products grouped by type with prices | full |
| `/sets/:game/:set/:card/:number` | Card detail: image, rules text, price + buy link, "Add to…", ownership (sign-in), price chart (sign-up wall), availability by city/store, other printings, legalities, rulings | ownership/chart/add gated |
| `/decks` | Community decks by game | full |
| `/decks/:game` | Decks grouped by format | full |
| `/decks/:game/:format` | Deck list for format | full |
| `/decks/:game/:format/:id` | Deck detail: header (likes, export, copy link, QR), total value, mana curve, types, colors, grouped deck list, opening-hand simulator, draw odds (hypergeometric), comments | comment + ownership gated |
| `/users/:username` | Public trader profile: badges, cities, stats, games, stores, meeting places, decks, haves, wants, "Message" | message + matches gated |
| `/swap-calculator` | Two-sided trade value calculator (qty, card search, finish) | full |
| `/scanner` | Marketing page for the iOS scanner | full |
| `/help`, `/help/:topic` | Help centre with topics (getting-started, faq, scanner, collection, trading, decks, search, stores, account, shortcuts, privacy, contact) | full |
| `/changelog` | Release notes | full |
| `/about`, `/contact`, `/privacy` | Static / contact form | full |
| `/sign-in`, `/sign-up` | Auth (email+password, social providers) | — |

### Signed-in (`/x/*`, disallowed in robots)

Observed from route literals in the bundle and the shortcuts page; details to be
confirmed by browsing signed in (see ticket 02).

| Route | Purpose |
|---|---|
| `/x/onboarding` | First-run setup (`?reason=`, return path) — pick games, city, stores, pricing |
| `/x/binder?section=collection\|haves\|wants&list=` | Binder: collection + trade lists, facets, search, sort, history view |
| `/x/binder/import` | CSV / pasted-list import wizard (`step`, `importId`) |
| `/x/lists` | Manage trade lists (haves/wants) |
| `/x/decks` | My decks + deck builder |
| `/x/stores`, `/x/stores/:slug` | My stores / store trading view |
| `/x/inbox`, `/x/inbox/:chatId` | Chat with traders |
| `/x/notifications` | Match alerts, trade updates |
| `/x/settings` | Profile, games, pricing source |
| (proposal modal) | Trade proposal preview / negotiation |

### Global chrome

- Header: logo, Find cards, Cards, Decks, Scanner, global search (`/` focus; cards or cities),
  theme toggle, Sign in / Sign up — or avatar menu when signed in.
- Mobile: hamburger drawer, avatar trigger.
- Command palette (Cmd/Ctrl+K), keyboard help (F1), "G then key" navigation.
- Footer: product, resources, tools, socials, legal.
- Toasts, confirm-delete modal, card details dialog, "What's new" modal, cookie consent.

## Anonymous vs signed-in model

Anonymous users can browse everything public. They get **capped** results on city
haves/wants (30), no matches, no price history, no ownership, no comments, no
messaging, no add-to-collection. Every gated action shows a sign-up prompt that
returns them to the same page after auth. Signed-in users without onboarding are
sent to `/x/onboarding`.

Implementation: one `useViewer()` hook (anonymous | signed-in, with onboarding flag)
and one `<RequireAuth>` / `<AuthGate>` primitive; limits live in a single
`viewerLimits` module so the business can tune them.

## Tickets

- [01 — App shell and public pages](issues/01-public-shell.md)
- [02 — Signed-in area](issues/02-signed-in-area.md)
