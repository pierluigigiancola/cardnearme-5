# 02 — Service contract

Status: ready-for-agent
Blocked by: 01

Spec: [../spec.md](../spec.md) · ADRs: [0002](../../../docs/adr/0002-one-record-per-owned-card.md), [0003](../../../docs/adr/0003-trade-completes-on-mutual-confirmation.md)

## What

Change `src/services/types.ts` and `src/services/services.ts` so the contract matches the glossary and the ADRs. This phase changes types and interfaces only. Implementations follow in 03 and 04, so land it together with 03.

## Acceptance criteria

**Identity and naming**

- [ ] A `UserId` type exists and replaces usernames everywhere data refers to a Trader. That covers `Trade.proposer`, `recipient`, `awaiting`, `cancelledBy` and `cashPayer`, `ChatMessage.author`, `TradeItem.ownerUsername`, and the parameters of `openChat` and `getContext`. Usernames remain only as display fields and in URLs.
- [ ] The current `Card` type (which has `setCode` and `number`) is renamed `Printing`. A Card-level identity exists that groups the Printings of one Card within a Game, for Wants to target.
- [ ] Service methods take IDs, not entities: `listPrintings(cardId)` and `getCardAvailability(cardId)`.

**One record per owned card (ADR 0002)**

- [ ] A Collection entry has a quantity, a for-trade quantity (≤ quantity) and a reserved quantity. A Have is a Collection entry with a for-trade quantity above zero.
- [ ] Every Have and every Want belongs to exactly one List (`listId` is not nullable for them). Each Trader has a default Haves List and a default Wants List.
- [ ] Visibility exists only on `List`.
- [ ] A Want targets a Card, with optional filters: Set, finish, language and minimum condition. An unset filter means "any".
- [ ] `BinderSection`, `TradeItem.listType` and `BinderItem.section` no longer describe the same concept twice. Public listing types are read projections of the same records.
- [ ] `TradeLine.sourceId` always refers to a Collection entry, on either side.
- [ ] The `inTrade` and `listed` flags are gone; reserved quantity and for-trade quantity replace them.

**Trades (ADR 0003)**

- [ ] `Trade` records a confirmation timestamp for each Trader.
- [ ] `trades.complete` becomes `trades.confirm`. Its doc comment says the Trade becomes Completed when both Traders have confirmed, and both Binders update in that step.
- [ ] Proposing a Trade is refused while the City is not unlocked. Matches are still returned.

**Limits and onboarding**

- [ ] `TradeItemQuery.limit` is documented as paging only. The doc comment says the server clamps it to the viewer's cap and reports `cappedAt`.
- [ ] `ProfileService.completeOnboarding` is documented as the only place onboarding is recorded (`profile.onboardedAt`).
- [ ] `MatchScope` is City-level, with an optional Store filter.

**Docs**

- [ ] The doc comments in `src/services/services.ts` describe the new contract, since they are now the only description of it the backend will be built against.
