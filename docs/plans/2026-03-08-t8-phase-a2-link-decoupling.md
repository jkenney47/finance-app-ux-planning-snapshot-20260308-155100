# Execution Packet: T8 Phase A2 Sandbox Link Decoupling

Date: 2026-03-08
Owner: Product + Engineering
Status: Planned

## Links

- Product plan: `docs/PRODUCT_PLAN.md`
- Rollout runbook: `docs/operations/runbook.md`
- Quality gate reference: `docs/operations/quality-gates.md`
- Active plan pointer (updated by finalize): `.agents/plan/current-plan.txt`

## Goal Summary

Restore the documented staged live-data rollout contract by separating:

1. sandbox Plaid linking
2. live dashboard/account-summary consumption

This slice should make Phase A2 work as documented without turning on the broader real-data dashboard path early.

## Scope

### In Scope

- Decouple live link-token and public-token exchange gating from `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA`.
- Add a safe linked-account verification path for the Plaid link screen that works during Phase A2.
- Preserve the current real dashboard summary gate behind `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA`.
- Add regression coverage for the split rollout contract.
- Record this T8 starter slice in the product plan.

### Out of Scope

- No Supabase function or migration changes.
- No transaction-ingestion or live-summary enrichment work.
- No dashboard fallback-contract redesign in this slice.
- No rollout-flag changes in shared environments.

## Risk Tier

- Tier: `HIGH`
- Rationale: this changes rollout-flag behavior on the live auth/link path, and a bad change could silently weaken staged rollout safety or expose broader live-data behavior earlier than intended.

## Repo Truth

- The rollout docs explicitly separate Phase A2 sandbox linking from Phase A3 real dashboard summary.
- The runtime code currently couples those paths by requiring both `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true` and `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true` before the live Plaid link screen path activates.
- The current tests codify that stricter coupling, so the repo can drift away from its documented rollout contract without warning.

## Exact Files To Ship

- `docs/plans/2026-03-08-t8-phase-a2-link-decoupling.md`
- `.agents/plan/current-plan.txt`
- `utils/account.ts`
- `app/(auth)/plaid-link.tsx`
- `__tests__/utils/account.test.ts`
- `__tests__/utils/dashboard.test.ts`
- `docs/PRODUCT_PLAN.md`

## Acceptance Criteria

- With `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true` and `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false`, the Plaid link screen uses the live sandbox link path instead of mock-only mode.
- `getPlaidLinkToken()` and `exchangePlaidPublicToken()` no longer require `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true`.
- Post-exchange link verification can confirm linked-account count/request ID without enabling the live dashboard summary path.
- `getDashboardSummary()` still returns the mock summary path whenever `realDataEnabled=false`.
- Regression tests fail if sandbox linking becomes re-coupled to the broader real-data summary flag.

## Implementation Order

1. Finalize this plan:

```bash
npm run plan:finalize -- docs/plans/2026-03-08-t8-phase-a2-link-decoupling.md "Finalize the first T8 slice to decouple Phase A2 sandbox linking from the live dashboard summary flag."
```

2. Split the live-link helper gating in `utils/account.ts`.
3. Update the Plaid link screen to use the dedicated verification path after exchange.
4. Add and update regression tests for the rollout contract.
5. Update the product plan status note for the T8 starter slice.
6. Run validation and the commit checkpoint.

## Validation Commands

Run in this order:

```bash
npm run plan:finalize -- docs/plans/2026-03-08-t8-phase-a2-link-decoupling.md "Finalize the first T8 slice to decouple Phase A2 sandbox linking from the live dashboard summary flag."
npm test -- --runInBand __tests__/utils/account.test.ts __tests__/utils/dashboard.test.ts __tests__/hooks/useDashboardData.test.tsx
npm run rollout:phase-a -- --phase A2 --dry-run
npm run validate
git status --short
git diff --name-only
git diff --cached --name-only
```

Expected checkpoint decision after validation: `Commit now` if the slice remains limited to the rollout-contract split and the hosted checks go green.

## Rollback

- Revert `utils/account.ts`, `app/(auth)/plaid-link.tsx`, the related tests, and the product-plan update together.
- If any shared QA regression appears, immediately revert rollout flags to A1 defaults:
  - `EXPO_PUBLIC_USE_MOCK_DATA=true`
  - `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=false`
  - `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false`

## Done Criteria

- Phase A2 sandbox linking is independently testable from the broader real-data dashboard path.
- Runtime helper logic matches the documented rollout sequence.
- Regression coverage locks the split contract in place.
- `npm run validate` passes.

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-08T17:04:59Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260308-130459-2026-03-08-t8-phase-a2-link-decoupling.md
Gemini-Review-Model: gemini-3.1-pro-preview

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-08T17:05:45Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260308-130545-2026-03-08-t8-phase-a2-link-decoupling-codex-approval.md
Codex-Approval-By: Codex
