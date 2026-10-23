# 04: Traders identified by UserId

**What to build:** Wherever data refers to a person, it uses a `UserId` (the Supabase auth user id), so renaming a username can't break Trades or chats. Usernames stay as display fields and in URLs. Trades, chats and public profiles look and work the same as before.

**Blocked by:** 03

**Status:** done

Spec: [../spec.md](../spec.md), decision 1

- [x] A `UserId` type exists.
- [x] `Trade.proposer`, `recipient`, `awaiting`, `cancelledBy` and `cashPayer`, `ChatMessage.author` and the TradeItem owner refer to a `UserId`. The TradeItem owner field is renamed to match.
- [x] `openChat` and `getContext` take a `UserId`.
- [x] The mock store keys Traders by `UserId`. Routes that take a username look it up at the boundary.
- [x] Usernames appear only as display fields and in URLs.
- [x] Trades, chat and public profiles still work in the browser, and `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
