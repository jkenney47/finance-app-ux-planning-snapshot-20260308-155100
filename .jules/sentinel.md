## 2025-02-28 - [Removed Hardcoded Dev Fallback Secrets]

**Vulnerability:** The Edge Functions `logFmeEvaluation` and `governPolicyPacks` used `"dev-fallback-secret"` as a default signing secret if `FME_LOG_SIGNING_SECRET` or `POLICY_OPS_SIGNING_SECRET` environment variables were omitted.
**Learning:** Hardcoded default secrets fundamentally break HMAC-based signature checks and authorization because any attacker can generate valid signatures for arbitrary payloads using the known fallback key.
**Prevention:** Fail securely. Always require production secrets to be explicitly configured. If missing, return a `503 Service Unavailable` response to prevent the endpoint from operating insecurely.

## 2025-03-02 - [Prevented Information Leakage via Error Messages]

**Vulnerability:** Several Supabase Edge Functions (e.g., `governPolicyPacks`, `plaidAccounts`) leaked raw database and API error messages (`error.message`) directly to clients in HTTP responses.
**Learning:** Exposing internal error messages provides an attacker with insights into the database schema, query structures, or upstream service states, aiding reconnaissance.
**Prevention:** Catch errors and log them server-side (e.g., `console.error`), but return generic error strings like "internal_error" to the client in the `details` field.

## 2025-05-15 - Information Leakage in API Responses

**Vulnerability:** The Edge Function used to exchange Plaid public tokens leaked raw database error messages (`error.message`) in the `details` field of the HTTP JSON error response upon upsert failures.
**Learning:** Returning raw database error strings to the client can expose sensitive schema details, structure, or state (Information Leakage/Improper Error Handling).
**Prevention:** Always sanitize database errors at the edge before returning them to clients by mapping them to generic constants like `"internal_error"`.

## 2025-03-05 - Fix case-sensitive Bearer token parsing in agentGateway

**Vulnerability:** The `getAuthenticatedUserId` function in `agentGateway/index.ts` was parsing the `Authorization` header using `.startsWith("Bearer ")`, which rejected valid case-insensitive (e.g., "bearer ") tokens and violated RFC 6750.
**Learning:** This could result in valid authenticated requests failing unexpectedly across different clients, while other endpoints used the correct `toLowerCase().startsWith("bearer ")` check.
**Prevention:** Always parse HTTP authorization schemes case-insensitively and normalize headers where possible across different edge functions.
