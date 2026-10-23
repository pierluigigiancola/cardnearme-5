# One record per owned card; Haves are Collection entries marked for trade

A Trader's owned cards are one set of records: a Have is a Collection entry with a for-trade quantity, not a separate item. Every Have and Want belongs to exactly one List, and visibility is set on the List only. Wants target a Card with optional printing filters, while Collection entries are always a concrete Printing.

## Consequences

- A Collection is private. Other Traders, and Matching, see only Haves on public Lists. In a Trade, you may add any card from your own Collection to your side, but your partner can pick only from your Haves.
- A Want with no filters accepts any Printing of its Card. Filters the Trader did set are binding: a received card fulfils the Want only if it meets every one.
- A private List hides its contents from other Traders only. Your own Matches still use all your Wants.

## Considered Options

- **Separate Haves and Collection records** (the reverse-engineered shell's model): the same physical card was recorded twice, kept in step by a `listed` flag and a double decrement on trade completion, and the two drifted whenever one side was edited alone.
- **Per-item visibility:** a second switch that conflicts with the List's, so nobody can tell whether a card is visible.
