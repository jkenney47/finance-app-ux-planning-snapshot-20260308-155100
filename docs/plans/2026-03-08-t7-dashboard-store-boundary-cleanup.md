# Execution Packet: T7 Dashboard Store Boundary Cleanup

Date: 2026-03-08
Owner: Product + Engineering
Status: Planned

## Links

- Product plan: `docs/PRODUCT_PLAN.md`
- Canonical orchestration policy: `docs/operations/agent-orchestration.md`
- Repo-specific multi-agent runbook: `docs/operations/codex-multi-agent.md`
- Active plan pointer (update before implementation): `.agents/plan/current-plan.txt`

## Goal Summary

Continue T7 (`Agent hooks and state modularity polish`) with the next highest-value client-state cleanup:

1. remove direct Zustand store consumption from `utils/dashboard.ts`
2. keep dashboard and FME computation logic pure in `utils/`
3. move store-backed React hook composition to a hook-layer boundary used by routes

This slice should clarify runtime ownership without changing product behavior.

## Scope

### In Scope

- Extract store-backed dashboard hooks out of `utils/dashboard.ts`.
- Keep pure dashboard summary and FME evaluation helpers in `utils/dashboard.ts`.
- Add a dedicated hook module that reads store state and composes the existing query/evaluation behavior.
- Update dashboard and onboarding route consumers to use the hook-layer module.
- Add focused regression coverage for the new boundary.

### Out of Scope

- No broad Zustand store API redesign.
- No query-layer cleanup outside the dashboard/FME path.
- No backend, auth, schema, or rollout-flag changes.
- No UI redesign beyond any import or wrapper changes required to preserve behavior.

## Risk Tier

- Tier: `MED`
- Rationale: this slice changes shared dashboard/onboarding hooks used across core routes, but it stays inside client-state composition and is intended to preserve current runtime behavior exactly.

## Repo Truth

- `docs/PRODUCT_PLAN.md` lists T7 as `Agent hooks and state modularity polish`, with explicit focus on execution brittleness and state boundaries.
- `utils/dashboard.ts` currently imports `useFactRegistryStore` and `useMockLinkedAccountsStore`, which mixes store-backed runtime state with reusable dashboard/domain helpers.
- Dashboard and onboarding routes already treat the dashboard module as their primary summary/FME integration surface, so the public hook shape should stay stable or change in one coherent batch.
- Existing UI tests mock the dashboard module, but there is no focused regression coverage proving the new hook-layer boundary continues to honor mock-linked-account state and fact overrides.

## Exact Files To Edit

- `docs/plans/2026-03-08-t7-dashboard-store-boundary-cleanup.md`
- `.agents/plan/current-plan.txt`
- `utils/dashboard.ts`
- `hooks/useDashboardData.ts` (new hook-layer boundary)
- `app/(dashboard)/_layout.tsx`
- `app/(dashboard)/accounts.tsx`
- `app/(dashboard)/index.tsx`
- `app/(dashboard)/insights.tsx`
- `app/(dashboard)/journey.tsx`
- `app/(dashboard)/profile.tsx`
- `app/(dashboard)/step/[recommendationId].tsx`
- `app/(onboarding)/index.tsx`
- `__tests__/components/DashboardFallbackFlows.test.tsx`
- `__tests__/hooks/useDashboardData.test.tsx`

## Target Behavior

### 1. `utils/dashboard.ts` stays reusable and store-free

- Keep pure functions for:
  - dashboard summary fetch/rollout logic
  - mock summary generation
  - fact merging
  - financial maturity evaluation from explicit inputs
- Remove direct imports of Zustand stores from this file.

### 2. Store-backed composition moves to `hooks/`

- Introduce `hooks/useDashboardData.ts` as the runtime boundary for:
  - `useDashboardSummary`
  - `usePrefetchDashboard`
  - `useFinancialMaturityEvaluation`
- Keep public return shapes stable so route behavior does not change.

### 3. Regression coverage locks the boundary

- Hook tests prove store state still flows into summary keys and FME fact merging.
- Existing route-level fallback tests continue to pass after import rewiring.

## Implementation Order

1. Finalize this plan:

```bash
npm run plan:finalize -- docs/plans/2026-03-08-t7-dashboard-store-boundary-cleanup.md "Continue T7 with dashboard store boundary cleanup"
```

2. Extract store-free helpers in `utils/dashboard.ts`.
3. Add `hooks/useDashboardData.ts` with store-backed wrappers.
4. Rewire dashboard and onboarding consumers to the new hook module.
5. Update route-level mocks to point at the hook module.
6. Add focused hook regression coverage.
7. Run targeted checks, then full validation and the commit checkpoint.

## Validation Commands

Run in this order:

```bash
npm run plan:finalize -- docs/plans/2026-03-08-t7-dashboard-store-boundary-cleanup.md "Continue T7 with dashboard store boundary cleanup"
npm test -- --runInBand __tests__/hooks/useDashboardData.test.tsx __tests__/components/DashboardFallbackFlows.test.tsx
npm run check:instruction-drift
npm run validate
git status --short
git diff --name-only
git diff --cached --name-only
```

Expected checkpoint decision after validation: `Commit now` if the slice passes validation and remains one coherent PR-sized batch.

## Rollback

- Revert `hooks/useDashboardData.ts` and the route import rewiring together.
- Revert the `utils/dashboard.ts` refactor and new hook tests together so the dashboard/FME boundary stays internally consistent.
- If needed, leave T7 open and restart with a narrower store-specific follow-up slice.

## Done Criteria

- `utils/dashboard.ts` no longer imports Zustand stores.
- Dashboard and onboarding routes use the hook-layer boundary for store-backed composition.
- Behavior stays unchanged at the route level.
- Targeted hook/route tests pass.
- `npm run validate` passes.

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-08T16:18:48Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260308-121848-2026-03-08-t7-dashboard-store-boundary-cleanup.md
Gemini-Review-Model: gemini-3.1-pro-preview

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-08T16:20:08Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260308-122008-2026-03-08-t7-dashboard-store-boundary-cleanup-codex-approval.md
Codex-Approval-By: Codex
