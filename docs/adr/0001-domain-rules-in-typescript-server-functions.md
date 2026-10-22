# Domain rules live in a TypeScript module run by server functions

Trading rules (the trade lifecycle, validation, store-join caps, the anonymous result cap) live in one pure TypeScript domain module. TanStack Start server functions run it against Supabase, and the mock services run the same module today, so the two can't drift apart. Supabase is the store, with row-level security as a safety net, not where the rules live.

## Considered Options

- **Postgres functions (Supabase RPC):** atomic by construction and close to the data, but the rules would be in a second language, the existing Vitest suite couldn't cover them, and the mock couldn't share them.
