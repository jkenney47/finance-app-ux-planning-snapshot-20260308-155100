# Store Conventions

This directory contains client-side Zustand stores for app/session state.

## Scope boundaries

- One concern per store file (session, onboarding, facts, preferences, etc.).
- Store files should not import other stores; compose state in hooks/screens.
- Domain logic belongs in `utils/`; stores should keep minimal mutation helpers.
- ESLint enforces this boundary by blocking `use*Store` imports from within `stores/use*Store.*` files.
- Source-of-truth ownership is explicit:
  - `useMockLinkedAccountsStore` owns linked-account state only in mock mode.
  - Live linked-account state is derived from fetched summary data (`utils/dashboard.ts`) and must not be backfilled into mock stores.
  - `useFactRegistryStore` only stores manual/override facts; derived facts are recomputed from current summary input.
  - `useOnboardingCompletionStore` is the only persisted onboarding state source-of-truth.
  - Onboarding step progression/input state remains local to `app/(onboarding)/index.tsx` unless a new shared requirement is explicitly introduced.

## Persistence rules

- Persist only state that must survive app restarts.
- Use the shared storage adapter in `stores/persistStorage.ts`.
- Persistence keys should be explicit, stable, and versioned when needed.

## Naming

- Use `use<Concern>Store.ts` naming.
- Expose focused actions (`set...`, `toggle...`, `reset...`) and avoid broad "set state" APIs.
- Keep public store types local to the store file unless shared externally.
