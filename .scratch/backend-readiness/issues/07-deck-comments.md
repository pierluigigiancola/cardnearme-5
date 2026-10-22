# 07 — Deck comments

Status: needs-triage
Blocked by: the real backend (not tracked in this effort)

Spec: [../spec.md](../spec.md), decision 8

## What

Deck comments currently show a toast instead of posting. Build them with the backend: signed-in Traders post and delete their own comments on public Decks, and anonymous visitors read them.

## Acceptance criteria

- [ ] Posting a comment stores it and shows it without a reload.
- [ ] A Trader can delete their own comments only.
- [ ] Comments on private Decks are visible only to the owner.
