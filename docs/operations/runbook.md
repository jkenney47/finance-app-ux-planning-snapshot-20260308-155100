# MVP Operations Runbook

Last updated: 2026-02-27
Audience: Product/Engineering operators

## 1. Preflight checks

Before any rollout or release-candidate handoff:

1. Ensure `.env` or `.env.local` has valid Supabase credentials.
2. Confirm Plaid secrets are configured in Supabase function env if live sandbox linking is enabled.
3. Run:

```bash
npm run validate
```

4. (Optional mock UI smoke) List and run available Maestro flows:

```bash
npm run e2e -- --list
npm run e2e -- critical-loop
```

5. (Optional UX loop batch smoke) Run one command to execute a flow matrix and capture artifacts:

```bash
npm run ux:loop:all
# artifacts land in artifacts/ux-loop/<timestamp>/
```

If Maestro is unavailable (not installed or Java runtime missing), `ux:loop` marks flows as `skipped` and still writes artifacts for visibility.

6. (Optional automated UI packet) Generate screenshot artifacts:

```bash
npm run ui:review
```

Review packet outputs:

- `artifacts/ui-review/<timestamp>/report.md`
- `artifacts/ui-review/<timestamp>/summary.json`
- `artifacts/ui-review/<timestamp>/screenshots/`

7. Confirm policy ops admin auth succeeds in `/(ops)/policy-ops`.

8. (Milestone 6 ingestion reliability) Run the ingestion checkpoint:

```bash
npm run rollout:ingestion -- --window-hours 24
```

Review `Warning count` in command output and attach artifacts from `artifacts/rollout-ingestion/<timestamp>/` to the rollout thread.

If Supabase CLI auth/linking has expired, re-establish it before deployment:

```bash
export SUPABASE_ACCESS_TOKEN=YOUR_SUPABASE_ACCESS_TOKEN
export SUPABASE_DB_PASSWORD=...  # database password for the target project
# Optional override if .env.local is unavailable or points to a different project:
# export SUPABASE_PROJECT_REF=...
bash scripts/release-supabase.sh
```

Treat any previously committed `SUPABASE_ACCESS_TOKEN` literal as compromised and rotate it before reusing local CLI auth.

Note: `scripts/release-supabase.sh` deploys `plaidWebhook`, `processPendingInsights`, `getNetWorthSlice`, and internal auth functions (`plaidLinkToken`, `plaidExchangeToken`, `plaidAccounts`, `logFmeEvaluation`, `chat-explain`, `agentGateway`).
`plaidLinkToken`, `plaidExchangeToken`, `plaidAccounts`, `logFmeEvaluation`, `chat-explain`, and `agentGateway` are deployed with `--no-verify-jwt`; they still validate bearer tokens internally.

## 2. Rollout flags

Client-side rollout behavior is controlled by:

- `EXPO_PUBLIC_USE_MOCK_DATA=true|false`
- `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true|false`
- `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true|false`

Recommended MVP progression:

1. Start with mock mode only (`EXPO_PUBLIC_USE_MOCK_DATA=true`, other rollout flags `false`).
2. Enable sandbox linking (`EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true`) for internal QA.
3. Enable real account summary (`EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true`) only after sandbox linking verifies account persistence.

Milestone 6 Phase A operator gate:

- Reject invalid or ambiguous flag values (`true`/`false` only).
- Do not enable `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true` while `EXPO_PUBLIC_USE_MOCK_DATA=true`.
- Keep rollback-ready defaults documented and immediately available (`EXPO_PUBLIC_USE_MOCK_DATA=true`, other rollout flags `false`).

### Milestone 6 Phase A environment sequence and sign-off

Use this sequence for shared environments and require all sign-offs before advancing:

| Phase | Environment                    | Required flags                                                                                                                | Validation evidence                                                                                                                                                         | Sign-off owner(s)                 |
| ----- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| A1    | Local + personal dev           | `EXPO_PUBLIC_USE_MOCK_DATA=true`, `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=false`, `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false` | `npm run validate` pass + mock flow evidence (`npm run e2e -- critical-loop` or `npm run ux:loop -- critical-loop`)                                                         | Engineering owner                 |
| A2    | Shared QA                      | `EXPO_PUBLIC_USE_MOCK_DATA=true`, `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true`, `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false`  | `npm run validate` pass + successful sandbox link/exchange + request-id capture from `plaidLinkToken` and `plaidExchangeToken`                                              | Engineering owner + QA/operator   |
| A3    | Shared QA (real summary trial) | `EXPO_PUBLIC_USE_MOCK_DATA=false`, `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true`, `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true`  | `npm run validate` pass + linked account fetch evidence + request-id capture from `plaidAccounts` + fallback check by toggling `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false` | Product owner + engineering owner |

Automated request-id capture command:

1. Configure QA credentials in `.env.local` (or shell):
   - `MILESTONE6_QA_EMAIL`
   - `MILESTONE6_QA_PASSWORD`
2. Run:

```bash
npm run rollout:phase-a -- --phase ALL
```

3. Attach generated artifacts from `artifacts/rollout-phase-a/<timestamp>/phase-a-report.{json,md}` to the release evidence thread.

Do not skip phases. If A2 fails, revert to A1 flags and triage before retry.
Record evidence and sign-off status in `docs/operations/milestone-6-phase-a-evidence-log.md`.

### Milestone 6 ingestion reliability checkpoint

Use this to validate webhook intake/queue health and downstream rollup behavior:

1. Ensure `SUPABASE_SERVICE_ROLE_KEY` is available in `.env.local` (or shell).
2. If available, export `PLAID_VERIFICATION_CODE` to enable an active synthetic webhook probe.
3. Run the queue worker to drain `pending_insights`:

```bash
curl -sS "${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/processPendingInsights" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -d '{"batch_size": 10}'
```

4. Run:

```bash
npm run rollout:ingestion -- --window-hours 24 --probe-webhook
```

5. If `PLAID_VERIFICATION_CODE` is unavailable, run without `--probe-webhook` and keep the skip reason in the artifact.
6. Attach:
   - `artifacts/rollout-ingestion/<timestamp>/ingestion-check.json`
   - `artifacts/rollout-ingestion/<timestamp>/ingestion-check.md`
7. If warnings are present, capture triage notes (owner + follow-up action) before promoting rollout flags.

## 3. Policy ops workflow

For policy pack governance in `/(ops)/policy-ops`:

1. Run `auth_probe` to verify operator access.
2. Use **Refresh all panels** in the operations health card to ensure current state before mutations.
3. Refresh draft policy packs (`refreshRatesPolicy`, `refreshThresholdsPolicy`) in dry-run mode.
4. Review diffs and audit entries.
5. Approve latest draft or rollback to a known-good version.
6. Verify dashboard/journey still renders with no policy fetch crash.

## 4. Plaid sandbox workflow

1. User opens `/(auth)/plaid-link`.
2. App requests `/plaidLinkToken` and (sandbox mode) receives `sandbox_public_token`.
3. App exchanges token via `/plaidExchangeToken`.
4. Accounts are retrieved through `/plaidAccounts` and reflected in dashboard summary when real data flag is enabled.

Web note: local Expo web runs from `localhost` and cross-origin function calls may be blocked without permissive CORS headers.
Treat iOS simulator/device smoke as the release-signoff source of truth for end-user Plaid linking.

## 5. Incident triage

If linked accounts fail to appear:

1. Check app error banner text for endpoint failure context.
2. Capture `request_id` from response payload or `X-Request-Id` header for support correlation.
3. Inspect Supabase edge function logs for:
   - `plaidLinkToken`
   - `plaidExchangeToken`
   - `plaidAccounts`
4. Validate DB tables have expected rows:
   - `plaid_items`
   - `accounts`
5. If real data path is unstable, set `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false` and keep mock fallback on.

If insights/goals fail to load:

1. Check RLS and schema for `user_goals` and `insights`.
2. Confirm authenticated user session is present.
3. Retry query from app and verify Supabase logs.

## 6. Rollback guidance

Use this order for safe rollback:

1. Disable client rollout flags to return to mock-only operation.
2. Revert to previous app build if UI flow regression persists.
3. If policy changes caused regression, use policy rollback endpoint to previous approved version.
4. Keep ingestion tables in place; they are backward compatible with mock mode.

## 7. Release ownership

- Rollback owner (engineering): Joey Kenney.
- Escalation channel: open a GitHub issue in `Finance-App` with label `release-blocker` and include the most recent `request_id` from failing edge-function responses.
- If a release-blocker issue is opened, pause rollout flags at mock-only defaults (`EXPO_PUBLIC_USE_MOCK_DATA=true`, `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=false`, `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false`) until triage is complete.
