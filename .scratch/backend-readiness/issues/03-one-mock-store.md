# 03: One mock store

**What to build:** A prefactor that keeps the current contract. Every Trader's data (Binder, Lists, Trades, chats) lives in one in-memory store that both the public pages and the signed-in workspace read and write. A Have you add in your Binder appears on your public profile and on City and Store pages without a reload. Today the public seed data and the per-user workspace are separate, so Matches, private Lists and two-sided completion can't work.

**Blocked by:** 01

**Status:** done

Spec: [../spec.md](../spec.md) · ADR: [0001](../../../docs/adr/0001-domain-rules-in-typescript-server-functions.md)

Note: 02 also edits the mock workspace. If both run at once, expect a merge.

- [x] One store holds every Trader's data, and the seed data loads into it.
- [x] Public services and workspace services both read and write that store.
- [x] Adding a Have in your Binder shows it on your public profile and on City and Store pages.
- [x] The workspace services closure (about 1,700 lines today) is split by concern (Binder, Lists, Trades, chat, profile and so on), with no behaviour change.
- [x] The workspace RPC accepts only known method names, and validates arguments before calling them.
- [x] Tests cover the store's behaviour, and `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
