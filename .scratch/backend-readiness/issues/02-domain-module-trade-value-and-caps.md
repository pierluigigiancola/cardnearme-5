# 02: Domain module, starting with trade value and caps

**What to build:** The first rules move into the pure domain module (ADR 0001), and the anonymous result cap becomes something the server decides. An anonymous visitor who asks for more results than the cap allows gets the capped amount, and the page says so. A browser can't raise the cap by sending a bigger `limit`.

**Blocked by:** 01

**Status:** done

Spec: [../spec.md](../spec.md), decision 2 · ADR: [0001](../../../docs/adr/0001-domain-rules-in-typescript-server-functions.md)

- [x] `src/domain/` exists as pure TypeScript, with no imports from React, the mock services or Supabase. Write it test-first; the `tdd` skill fits.
- [x] Trade value is one domain function. The three current copies (trade math helper, mock workspace, Trade builder) call it.
- [x] The store-join cap and the anonymous result cap live in the domain module. The old auth limits file becomes a thin re-export, which 16 removes.
- [x] The workspace RPC works out the viewer's cap from the session. The client's `limit` is used for paging only and is clamped to the cap.
- [x] Capped responses report `cappedAt`, and the UI uses it to tell the visitor that results were capped.
- [x] The doc comment on `TradeItemQuery.limit` describes the paging-only, server-clamped contract.
- [x] Every rule has unit tests, and `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm test` pass.
