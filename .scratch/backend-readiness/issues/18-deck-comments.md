# 18: Deck comments

**What to build:** Deck comments show a toast instead of posting. Build them with the backend: signed-in Traders post and delete their own comments on public Decks, and anonymous visitors read them.

**Blocked by:** the real backend (not tracked in this effort)

**Status:** needs-triage

Spec: [../spec.md](../spec.md), decision 8

- [ ] Posting a comment stores it and shows it without a reload.
- [ ] A Trader can delete their own comments only.
- [ ] Comments on private Decks are visible only to the owner.
