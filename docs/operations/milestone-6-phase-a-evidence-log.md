# Milestone 6 Phase A Evidence Log

Last updated: 2026-02-27
Owner: Product + Engineering

Use this artifact to record rollout evidence and required sign-off for each Phase A promotion step.

## Phase A rollout evidence

| Phase | Environment                    | Flag profile                                                                                                                  | Validation run                        | QA evidence                                                                                           | Request-id evidence                                                                                                     | Sign-off owners                   | Decision                           | Date       |
| ----- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------- | ---------- |
| A1    | Local + personal dev           | `EXPO_PUBLIC_USE_MOCK_DATA=true`, `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=false`, `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false` | `npm run validate` pass on 2026-02-26 | `npm run e2e -- critical-loop` passed on 2026-02-26 after Dev Client attach + flow selector hardening | N/A                                                                                                                     | Engineering owner                 | Ready for sign-off                 | 2026-02-26 |
| A2    | Shared QA                      | `EXPO_PUBLIC_USE_MOCK_DATA=true`, `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true`, `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false`  | `npm run validate` output link/log    | Sandbox token + exchange verification                                                                 | `plaidLinkToken`: `96aa2005-7dbd-4476-b461-f30b245cfe44` / `plaidExchangeToken`: `f2e84071-4851-438c-b95e-4f3903b5658c` | Engineering owner + QA/operator   | Engineering + QA/operator approved | 2026-02-27 |
| A3    | Shared QA (real-summary trial) | `EXPO_PUBLIC_USE_MOCK_DATA=false`, `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true`, `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true`  | `npm run validate` output link/log    | Linked-account summary fetch + fallback check (`EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false`)          | `plaidAccounts`: `aff1f698-1ccb-4904-a4dc-407914c40eee`                                                                 | Product owner + engineering owner | Product + engineering approved     | 2026-02-27 |

## Notes

- Record exact `request_id` values from response payloads or `X-Request-Id` headers.
- Run `npm run rollout:phase-a -- --phase ALL` to capture A2/A3 request IDs and generate `phase-a-report.{json,md}` under `artifacts/rollout-phase-a/<timestamp>/`.
- Set `MILESTONE6_QA_EMAIL` and `MILESTONE6_QA_PASSWORD` in `.env.local` (or the shell) before running the capture command.
- Java runtime prerequisite is now satisfied via Homebrew `openjdk@21`.
- If any phase fails, set flags back to A1 defaults and open a `release-blocker` issue before retry.
- Keep links to screenshots/log captures adjacent to the row in PR or issue comments.

## Ingestion reliability evidence

| Run date (ET) | Command                                                          | Artifact directory                             | Probe status                          | Warning count | Triage owner      | Triage note                                                                                                                                                                                                           | Decision                                                                                                 |
| ------------- | ---------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------- | ------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 2026-02-27    | `npm run rollout:ingestion -- --window-hours 24 --probe-webhook` | `artifacts/rollout-ingestion/20260227-191050/` | `ok` (`webhookProbe` + `rollupProbe`) | 1             | Engineering owner | `raw_transactions` and `pending_insights` are receiving recent rows, but `transactions` has zero recent normalized rows. Confirm/implement queue-consumer normalization before broader rollout promotion.             | Hold promotion beyond shared QA until normalized `transactions` rows are observed in a fresh checkpoint. |
| 2026-02-27    | `npm run rollout:ingestion -- --window-hours 24 --probe-webhook` | `artifacts/rollout-ingestion/20260227-192840/` | `ok` (`webhookProbe` + `rollupProbe`) | 0             | Engineering owner | Post-fix verification confirms normalized `transactions` ingestion is healthy and no recent `raw_transactions`/`pending_insights` failures remain. `plaidWebhook` request-id: `c6c30520-0557-4511-9f96-d7118d48ad1e`. | Ingestion reliability gate passed; Phase A rollout evidence is clean for this checkpoint.                |
