# A Trade completes only when both Traders confirm

Each Trader confirms their side of an accepted Trade. The Trade becomes Completed when both have, and both Binders update in that same step. Nobody's Binder changes without their own action, and the update is still a single atomic moment.

## Consequences

- An accepted Trade stays open until both confirm. Either Trader can still cancel it, and it never completes on its own; a Trader who hasn't confirmed only gets reminders.
- Accepting a Trade reserves its cards. An acceptance that would need more copies than the Trader owns, minus what is already reserved, is refused. Pending proposals reserve nothing.

## Considered Options

- **One click completes it for both:** simplest, but one Trader's click (even by mistake, before the meetup) would change the other's Binder without them doing anything.
- **Each Binder updates when its owner confirms:** no one acts for the other, but it leaves a half-applied Trade visible in both Binders.
