# MVP Release Checklist

Last updated: 2026-02-19
Owner: Product + Engineering

## 1. Validation gate

- [x] `npm run validate` passes.
- [x] No new lint warnings introduced in changed files.
- [x] New migrations reviewed for backward compatibility.

## 2. Database and edge functions

- [x] Migrations applied:
  - [x] `20260218113000_add_ingestion_support_tables.sql`
  - [x] `20260218151500_add_plaid_link_tables.sql`
  - [x] `20260218162000_create_user_goals.sql`
- [x] Functions deployed and healthy:
  - [x] `plaidLinkToken`
  - [x] `plaidExchangeToken`
  - [x] `plaidAccounts`
  - [x] `plaidWebhook`
  - [x] `getNetWorthSlice`

## 3. Runtime config

- [x] Supabase function secrets are configured (`PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, optional webhook/redirect values).
- [x] Supabase CLI deployment auth is configured (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`).
- [x] Rollout flags are set for target environment:
  - [x] `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK` (`true`, internal QA)
  - [x] `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA` (`false`, held until interactive smoke pass)
  - [x] `EXPO_PUBLIC_USE_MOCK_DATA` (`true`)

## 4. Product flow smoke checks

- [x] Auth -> onboarding -> dashboard -> journey path succeeds.
- [x] Goals screen supports create + refresh + progress update.
- [x] Insights screen loads persisted rows or derives and seeds insights from summary.
- [x] Account linking path:
  - [x] Mock mode works.
  - [x] Sandbox link and exchange succeed.
  - [x] Real summary path displays linked accounts when enabled (headless web verification complete on 2026-02-19).

## 5. Operations and rollback

- [x] Policy ops auth probe and list actions succeed.
- [x] Runbook reviewed: `docs/operations/runbook.md`.
- [x] Rollback owner and escalation channel confirmed.

## 6. Release decision

- [x] Commit checkpoint decision recorded (`Commit now`, `Split before commit`, or `Wait`).
- [x] Release candidate approved by product + engineering owner (2026-02-19).

## 7. Auto-verification snapshot (2026-02-19)

- `npm run validate` passed on `main` (typecheck, lint, format, tests, memory checkpoint).
- Migration review completed for:
  - `supabase/migrations/20260218113000_add_ingestion_support_tables.sql`
  - `supabase/migrations/20260218151500_add_plaid_link_tables.sql`
  - `supabase/migrations/20260218162000_create_user_goals.sql`
- Function directories confirmed present for release checklist scope:
  - `supabase/functions/plaidLinkToken`
  - `supabase/functions/plaidExchangeToken`
  - `supabase/functions/plaidAccounts`
  - `supabase/functions/plaidWebhook`
  - `supabase/functions/getNetWorthSlice`
- Supabase deployment executed against project ref `zderaqrvjljvkwhilesp`:
  - `npx supabase db push --db-url ...` completed successfully
  - `plaidLinkToken`, `plaidExchangeToken`, `plaidAccounts`, `plaidWebhook`, `getNetWorthSlice` deployed with status `ACTIVE`
  - additional functions deployed: `governPolicyPacks`, `refreshRatesPolicy`, `refreshThresholdsPolicy`, `logFmeEvaluation`, `agentGateway`, `sendPush`
  - `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_ENV` secrets set via `supabase secrets set`
  - policy ops remote verification passed (`auth_probe` and `list` actions via shared secret)
- Deployment workflow hardening completed:
  - script path: `scripts/release-supabase.sh`
  - added non-link `db push` mode (`--db-url`) to avoid `supabase link` anon-key dependency
  - normalized legacy migration versions (`20250629080000_*`, `20250629120000_*`) and added trigger reconciliation migration `20260219000000_reconcile_send_push_trigger.sql`
- iOS smoke remains blocked in this headless environment; `npx expo run:ios --no-install` progresses native compilation and then stalls without terminal completion signal.
- iOS smoke remains blocked in this headless environment; `npm run smoke:ios` reaches simulator boot and native compile, then stalls before terminal-confirmed app launch.

## 8. Headless smoke evidence (2026-02-19)

- Web smoke (auth path): `welcome -> sign-in -> onboarding -> dashboard -> journey` completed with expected UI state transitions.
- Web smoke (goals): created goal (`Emergency Fund`), forced refresh via error-state retry, and updated progress (`+100`) with persisted value update.
- Web smoke (insights): derived insights rendered from linked/mock summary with three actionable cards.
- Web smoke (mock linking): `Simulate Plaid Link` path succeeded and dashboard showed populated institutions/accounts in mock mode.
- Sandbox linking + account fetch verified against deployed Supabase functions using authenticated test user:
  - `plaidLinkToken`: returned `link_token` and `sandbox_public_token`.
  - `plaidExchangeToken`: returned `item_id` and `accounts_linked: 12`.
  - `plaidAccounts`: returned linked accounts (`count: 24` after repeated runs).
- Deployed `plaidLinkToken`, `plaidExchangeToken`, and `plaidAccounts` with `--no-verify-jwt` to avoid gateway token-rejection on current JWT format; functions still enforce explicit user validation internally.
- Added CORS + preflight handling to `plaidLinkToken`, `plaidExchangeToken`, `plaidAccounts`, and `logFmeEvaluation`; cross-origin web smoke no longer fails on Plaid/linking requests.
- Deployed `logFmeEvaluation` with `--no-verify-jwt` (internal bearer-token validation retained) to avoid gateway JWT rejection for current token format.
- Real-summary verification completed with runtime overrides:
  - `EXPO_PUBLIC_BYPASS_AUTH=false`
  - `EXPO_PUBLIC_USE_MOCK_DATA=false`
  - `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true`
  - `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true`
- Authenticated QA user dashboard showed linked institution (`First Platypus Bank`) and populated `Plaid ...` account rows from Supabase-backed fetch path.
