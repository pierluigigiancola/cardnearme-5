# 04 — Mock on one store

Status: ready-for-agent
Blocked by: 03

Spec: [../spec.md](../spec.md) · ADRs: [0001](../../../docs/adr/0001-domain-rules-in-typescript-server-functions.md), [0002](../../../docs/adr/0002-one-record-per-owned-card.md)

## What

Rebuild `src/services/mock/` around one in-memory store that every Trader's data lives in, with every rule going through `src/domain/`. Today public lists (`mockServices.ts`, seed data) and the signed-in workspace (`workspace.ts`, one state per user) are separate, so Matches, private Lists and two-sided completion can't actually work.

## Acceptance criteria

- [ ] One store holds every Trader's Collection, Wants, Lists, Trades and chats. Public pages and the signed-in workspace read and write it.
- [ ] Adding a Have in your Binder shows it on your public profile and on city and store pages. Making a List private hides it there.
- [ ] Confirming a Trade on both sides updates both Traders' Binders.
- [ ] `createWorkspaceServices` no longer contains trading rules: it delegates to `src/domain/`, and the roughly 900-line closure is split by concern.
- [ ] The workspace RPC (`workspaceRpc.ts`) accepts only known method names and validates arguments before calling them.
- [ ] The RPC handler works out the anonymous result cap from the session, not from the client's `limit`.
- [ ] Onboarding state is read from and written to `profile.onboardedAt` only. The `user_metadata.onboarded` write in `src/routes/x/onboarding.tsx` and its reads in `src/auth/viewer.ts` are removed, and the demo sign-in path follows the same rule.
- [ ] In development only, mock partners auto-accept proposals and auto-confirm accepted Trades after a short delay.
- [ ] `pnpm test` passes, including tests for the mock's store behaviour.
