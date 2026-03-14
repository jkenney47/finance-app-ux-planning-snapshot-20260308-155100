# Gemini Plan Review

- Plan: `docs/plans/2026-03-08-t7-dashboard-store-boundary-cleanup.md`
- Generated-At-UTC: 2026-03-08T16:18:48Z
- Model: gemini-3.1-pro-preview

MCP issues detected. Run /mcp list for status.Here is the review of the T7 dashboard store boundary cleanup plan:

### 1. P0/P1/P2 Risks
- **P1/P2 Risk (Dependency Inversion):** `hooks/useDashboardData.ts` will need to import types (`DashboardSummary`) and newly exported pure helpers (e.g., `buildMergedFacts`, `getDashboardSummaryWithRollout`) from `utils/dashboard.ts`. Ensure these internal functions are cleanly exported from `utils/dashboard.ts` and that no circular dependencies are introduced between the two files.

### 2. Missing Steps or Hidden Dependencies
- **Test Mock Updates:** `__tests__/components/DashboardFallbackFlows.test.tsx` currently uses `jest.mock("@/utils/dashboard")` to spy on these hooks. The plan must explicitly include updating this mock to target `@/hooks/useDashboardData` while ensuring that type-only imports (like `DashboardSummary`) from `utils/dashboard.ts` are left intact and unmocked. 

### 3. Frontend State Coverage (loading/error/empty/offline)
- The plan correctly mandates keeping the public return shapes stable. By transparently passing through the full TanStack Query result (`isLoading`, `isError`, etc.) and `isPolicyLoading`/`isPolicyError` flags, the existing UI state coverage will remain fully intact without changes.

### 4. Accessibility Risks
- **None.** This is purely a state-boundary cleanup and import rewire. The plan accurately restricts scope to exclude UI changes, meaning accessibility is inherently unaffected.

### 5. Concrete Tests to Add or Run
- **Add to `__tests__/hooks/useDashboardData.test.tsx`:** 
  - Explicitly test that `useFinancialMaturityEvaluation` correctly merges the `factOverrides` from `useFactRegistryStore` into the final FME evaluation.
  - Explicitly test that `useDashboardSummary` dynamically respects changes when the `hasMockLinkedAccounts` state is toggled in `useMockLinkedAccountsStore`.

### 6. Simpler Alternatives if Complexity is Unnecessary
- The proposed approach of grouping the store-backed hooks into `hooks/useDashboardData.ts` is solid and appropriately scopes the batch update. Alternatively, you could split them into `hooks/useDashboardSummary.ts` and `hooks/useFinancialMaturityEvaluation.ts` if a strict one-hook-per-file pattern is preferred, but the grouped approach is perfectly acceptable and simpler for this refactor.
