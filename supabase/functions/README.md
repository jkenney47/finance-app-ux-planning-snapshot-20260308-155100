# Supabase Edge Functions (`supabase/functions`)

This folder contains backend HTTP entrypoints for app and ops workflows.

## Invariants

- Secrets stay in Supabase function environment variables only.
- Client-facing responses must be JSON and include request correlation IDs.
- Error responses should use the shared HTTP helpers in `_shared/http.ts`.

## Layout

- One function per directory: `<functionName>/index.ts`.
- Shared utilities live in `_shared/`.

## Testing/Verification

- Unit-level helpers are tested from `__tests__/utils/` where imported.
- Validate endpoint contract changes in `docs/reference/endpoints.md`.
- Run `npm run validate` after function contract or auth changes.
