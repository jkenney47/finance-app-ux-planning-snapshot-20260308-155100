# API Endpoints Reference

This document lists the main API endpoints for your AI Financial Advisor backend, with example requests and responses. Update as you add or change endpoints.

---

## Plaid and Portfolio Endpoints

### POST /plaidLinkToken (implemented)

- **Description:** Creates a Plaid Link token for the authenticated user and can optionally auto-generate a sandbox `public_token` for non-SDK bootstrap flows.
- **Function path:** `supabase/functions/plaidLinkToken/index.ts`
- **Used by:** `utils/account.ts#getPlaidLinkToken`
- **Auth:** `Authorization: Bearer <Supabase JWT>`
- **Request:**

```json
{
  "userId": "00000000-0000-4000-8000-000000000001",
  "sandbox_auto_link": true
}
```

- **Response:**

```json
{
  "link_token": "link-sandbox-123",
  "sandbox_public_token": "public-sandbox-abc",
  "mode": "sandbox",
  "request_id": "f84d4a9d-3ef6-4e72-a385-18629f421948"
}
```

### POST /plaidExchangeToken (implemented)

- **Description:** Exchanges Plaid `public_token`, stores item/account rows, and returns linked account count.
- **Function path:** `supabase/functions/plaidExchangeToken/index.ts`
- **Used by:** `utils/account.ts#exchangePlaidPublicToken`
- **Auth:** `Authorization: Bearer <Supabase JWT>`
- **Request:**

```json
{
  "public_token": "public-sandbox-abc",
  "userId": "00000000-0000-4000-8000-000000000001"
}
```

- **Response:**

```json
{
  "item_id": "item-xyz",
  "accounts_linked": 3,
  "mode": "sandbox",
  "request_id": "29db32ed-26a1-4819-8b8e-30f03b7134f2"
}
```

### POST /plaidAccounts (implemented)

- **Description:** Returns the authenticated user's linked Plaid accounts from persisted account rows.
- **Function path:** `supabase/functions/plaidAccounts/index.ts`
- **Used by:** `utils/account.ts#fetchLinkedAccounts`
- **Auth:** `Authorization: Bearer <Supabase JWT>`
- **Request:**

```json
{
  "userId": "00000000-0000-4000-8000-000000000001"
}
```

- **Response:**

```json
{
  "accounts": [
    {
      "account_id": "acc-123",
      "name": "Plaid Checking",
      "type": "depository",
      "subtype": "checking",
      "mask": "0000",
      "institution_name": "First Platypus Bank",
      "balances": {
        "current": 2500.5,
        "iso_currency_code": "USD"
      }
    }
  ],
  "request_id": "ce940aa0-44fc-4c6d-8f54-1e58b85d8200"
}
```

### POST /plaidWebhook (implemented)

- **Description:** Accepts Plaid transaction webhook events and stores queue rows for downstream processing.
- **Function path:** `supabase/functions/plaidWebhook/index.ts`
- **Request:**

```json
{
  "webhook_type": "TRANSACTIONS",
  "webhook_code": "TRANSACTIONS_WEBHOOK",
  "item_id": "mock-item-xyz"
}
```

- **Response:**

```json
{
  "status": "queued",
  "raw_transaction_id": "0f9cb74d-f861-46f6-95a1-f8836b2a44e1",
  "pending_insight_id": "a53f9d03-0262-45e8-a4fc-fe59dbf2af45"
}
```

### POST /processPendingInsights (implemented)

- **Description:** Internal queue worker that first requeues stale `processing` claims (older than 15 minutes), then claims `pending_insights` rows, syncs Plaid transactions, and updates queue/raw statuses.
- **Function path:** `supabase/functions/processPendingInsights/index.ts`
- **Auth:** `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` or `x-pending-insights-secret: <PENDING_INSIGHTS_WORKER_SECRET>`
- **Request:**

```json
{
  "batch_size": 10
}
```

- **Response:**

```json
{
  "status": "ok",
  "batch_size": 10,
  "requeued": 1,
  "scanned": 4,
  "claimed": 4,
  "processed": 3,
  "failed": 1,
  "skipped": 0,
  "errors": [
    {
      "pending_insight_id": "2e4f9f49-4666-48bc-86af-cfefb0f9ca8a",
      "message": "No linked Plaid item found for queue event."
    }
  ]
}
```

- **Error codes:**
  - `pending_insights_requeue_failed`: stale-claim recovery failed before queue polling.
  - `pending_insights_select_failed`: queue polling failed.

### POST /getNetWorthSlice (implemented)

- **Description:** Calls `public.rollup_net_worth` and returns daily net-worth rollup rows.
- **Function path:** `supabase/functions/getNetWorthSlice/index.ts`
- **Request:**

```json
{
  "user_id": "00000000-0000-4000-8000-000000000001",
  "days": 90
}
```

### POST /chat-explain (implemented)

- **Description:** Validates a plain-language financial prompt and returns an education-only explanation payload.
- **Function path:** `supabase/functions/chat-explain/index.ts`
- **Used by:** `utils/chat.ts#callExplainModel`
- **Auth:** `Authorization: Bearer <Supabase JWT>`
- **Request:**

```json
{
  "prompt": "Explain how to prioritize emergency savings versus extra debt payments."
}
```

- **Response:**

```json
{
  "markdown": "### Plain-English Explanation\n\n...",
  "response": "### Plain-English Explanation\n\n...",
  "raw": {
    "mode": "deterministic",
    "promptLength": 74
  },
  "request_id": "7aaf2e2a-b7bf-42de-b826-5c75f9d651ce"
}
```

---

## Error Response Contract

```json
{
  "error": "Invalid request body",
  "message": "Invalid request body",
  "code": "invalid_request",
  "request_id": "2a31a357-8bd6-4125-b97d-8cd58d8fceec",
  "details": {
    "field": "user_id"
  }
}
```

- `error`: backward-compatible error string for existing clients.
- `message`: canonical human-readable message.
- `code`: stable machine-readable error code.
- `request_id`: correlation ID also returned in `X-Request-Id` response header.
- `details` and `context`: optional structured metadata for troubleshooting.

---

**Note:** Endpoint contracts are documented here as the source of truth for client helper alignment.

---

## Agent Interop Endpoints

### POST /agentGateway

- **Description:** Routes an agent invocation through the provider registry. Supports dry-run mode for provider scaffolding before secrets/endpoints are configured.
- **Function path:** `supabase/functions/agentGateway/index.ts`
- **Auth:** `Authorization: Bearer <Supabase JWT>` (required)
- **Built-in mock path:** `mock_agent_bridge` supports authenticated non-dry-run invocations even without `endpoint_url` and returns deterministic mock output for local/QA validation.
- **Supported provider protocols:**
  - `finance_app_v1` (default): plain JSON payload with `capability`, `instruction`, `context`, and `constraints`.
  - `json_rpc_2_0`: JSON-RPC envelope (`method` defaults to `agent.invoke`; override with `agent_providers.metadata.rpc_method`).
- **Request:**

```json
{
  "providerKey": "mock_agent_bridge",
  "capability": "plan",
  "instruction": "Summarize the next best three actions for this user.",
  "context": {
    "source": "agent_hub"
  },
  "dryRun": true
}
```

- **Configuration notes:**
  - `AGENT_GATEWAY_ALLOWED_HOSTS` controls which external hosts can be called in non-dry-run mode.
  - Provider credentials are read from env keys referenced by `agent_providers.metadata` (for example `api_key_env_key` or `token_env_key`).
  - Provider protocol is read from `agent_providers.metadata.protocol` (`finance_app_v1` if omitted).

- **Response:**

```json
{
  "requestId": "b2c8d9a8-9f4f-4aa2-9d16-b3a8b89f7304",
  "providerKey": "mock_agent_bridge",
  "capability": "plan",
  "status": "dry_run",
  "output": "Dry run only. Provider Mock Agent Bridge is registered and ready for external routing.",
  "latencyMs": 3,
  "warnings": []
}
```

---

## Policy Refresh Endpoints

### POST /refreshRatesPolicy

- **Description:** Refreshes the `rates` policy pack using the latest FRED DFF series value (or request override), then stages (`publishMode: "draft"`) or approves (`publishMode: "approved"`, default) a new version only when values changed.
- **Auth:** Requires either `x-policy-refresh-secret` matching `POLICY_REFRESH_SECRET`, or `Authorization: Bearer <Supabase JWT>` for an admin user (`policy_ops_admins` or `POLICY_OPS_ADMIN_USER_IDS`).
- **Request:**

```json
{
  "region": "US",
  "jurisdiction": "federal",
  "dryRun": true,
  "publishMode": "draft"
}
```

- **Response (dry run):**

```json
{
  "status": "dry_run",
  "region": "US",
  "jurisdiction": "federal",
  "version": 3,
  "publishMode": "draft",
  "effectiveFrom": "2026-02-17T00:00:00.000Z",
  "rates": {
    "riskFreeRateApy": 0.0425,
    "debtRiskPremiumApr": 0.03,
    "toxicAprFloor": 0.08,
    "greyZoneAprFloor": 0.059
  }
}
```

### POST /refreshThresholdsPolicy

- **Description:** Refreshes the `thresholds` policy pack using FRED CPI year-over-year inflation to calibrate `starterFundFloor` (or request override), then stages (`publishMode: "draft"`) or approves (`publishMode: "approved"`, default) a new version only when values changed.
- **Auth:** Requires either `x-policy-refresh-secret` matching `POLICY_REFRESH_SECRET`, or `Authorization: Bearer <Supabase JWT>` for an admin user (`policy_ops_admins` or `POLICY_OPS_ADMIN_USER_IDS`).
- **Request:**

```json
{
  "region": "US",
  "jurisdiction": "federal",
  "dryRun": true,
  "publishMode": "draft"
}
```

- **Response (dry run):**

```json
{
  "status": "dry_run",
  "region": "US",
  "jurisdiction": "federal",
  "version": 4,
  "publishMode": "draft",
  "effectiveFrom": "2026-02-17T00:00:00.000Z",
  "thresholds": {
    "starterFundFloor": 2600,
    "fortressFundMonths": {
      "stableSingle": 6,
      "stableDual": 3,
      "variableSingle": 9,
      "variableDual": 6
    }
  },
  "inputs": {
    "yoyInflation": 0.038
  }
}
```

### POST /governPolicyPacks

- **Description:** Performs policy governance operations by action: `list`, `list_audits`, `list_admins`, `set_admin_status`, `auth_probe`, `approve_latest_draft`, or `rollback_to_version`.
- **Auth:**
  - `list` and `list_audits` are read-only.
  - `list_admins`, `set_admin_status`, `auth_probe`, `approve_latest_draft`, and `rollback_to_version` require either `x-policy-refresh-secret` matching `POLICY_REFRESH_SECRET`, or `Authorization: Bearer <Supabase JWT>` for an admin user (`policy_ops_admins` or `POLICY_OPS_ADMIN_USER_IDS`).
- **Request (list):**

```json
{
  "action": "list",
  "region": "US",
  "jurisdiction": "federal",
  "limit": 120
}
```

- **Notes:** `list` returns each row with `source` and `pack` so the UI can run agent-based draft review workflows before approval.

- **Request (rollback example):**

```json
{
  "action": "rollback_to_version",
  "domain": "rates",
  "region": "US",
  "jurisdiction": "federal",
  "targetVersion": 4
}
```

- **Request (list audits):**

```json
{
  "action": "list_audits",
  "region": "US",
  "jurisdiction": "federal",
  "limit": 25
}
```

- **Request (list admins):**

```json
{
  "action": "list_admins",
  "limit": 50
}
```

- **Request (set admin status):**

```json
{
  "action": "set_admin_status",
  "targetUserId": "00000000-0000-4000-8000-000000000001",
  "active": true,
  "notes": "Granted by policy ops dashboard"
}
```

- **Request (auth probe):**

```json
{
  "action": "auth_probe"
}
```

- **Response (rollback):**

```json
{
  "status": "rolled_back",
  "domain": "rates",
  "region": "US",
  "jurisdiction": "federal",
  "version": 7,
  "effectiveFrom": "2026-02-18T12:00:00.000Z",
  "copiedFromVersion": 4,
  "operationSignature": "fnv1a_5f2cb27e",
  "artifactSignature": "82963c3db580fbf6358f652f76c6880e28f1834f0c92fce6ce5a5f82f5ea2d97",
  "signaturePersistence": "full"
}
```

- **Audit behavior:**
  - `approve_latest_draft` and `rollback_to_version` persist policy-pack audit rows to `policy_ops_audits`.
  - `set_admin_status` persists admin-governance audit rows using domain `policy_ops_admins`.
  - Audit rows include actor metadata plus `operation_signature` and `artifact_signature` (`POLICY_OPS_SIGNING_SECRET`, fallback `FME_LOG_SIGNING_SECRET`).
- **Audit domain filter:** `list_audits` supports policy domains plus `policy_ops_admins`.
- **Admin setup:** Add users to `policy_ops_admins` (preferred) or set `POLICY_OPS_ADMIN_USER_IDS` for bootstrap allowlisting.

---

## FME Logging Endpoints

### POST /logFmeEvaluation

- **Description:** Persists an evaluation artifact server-side, computes deterministic `evaluationSignature`, and signs it with `FME_LOG_SIGNING_SECRET` to produce `artifactSignature`.
- **Auth:** Requires authenticated Supabase user bearer token.
- **Request:**

```json
{
  "facts_hash": "fnv1a_1234abcd",
  "facts_summary": {},
  "policy_versions": {
    "rates": 4,
    "thresholds": 3,
    "limits": 1,
    "tax_labels": 1
  },
  "rule_version": 1,
  "output_summary": {
    "mode": "build",
    "primaryRecommendationId": "capture_employer_match"
  },
  "trace": []
}
```

- **Response (inserted):**

```json
{
  "status": "inserted",
  "logId": "57d8186e-d7f8-4fac-a4f4-a708f4f2eb35",
  "evaluationSignature": "fnv1a_5f2cb27e",
  "artifactSignature": "82963c3db580fbf6358f652f76c6880e28f1834f0c92fce6ce5a5f82f5ea2d97",
  "signaturePersistence": "full"
}
```
