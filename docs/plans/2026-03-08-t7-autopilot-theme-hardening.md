# Execution Packet: T7 Autopilot + Theme Hardening Starter

Date: 2026-03-08
Owner: Product + Engineering
Status: Planned

## Links

- Product plan: `docs/PRODUCT_PLAN.md`
- Canonical orchestration policy: `docs/operations/agent-orchestration.md`
- Repo-specific multi-agent runbook: `docs/operations/codex-multi-agent.md`
- Active plan pointer (update before implementation): `.agents/plan/current-plan.txt`

## Goal Summary

Start T7 (`Agent hooks and state modularity polish`) with the highest-value low-blast-radius slice:

1. harden `.agents/hooks/codex-autopilot.sh` around repo-memory failures in a deterministic, testable way
2. remove duplicate theme-mode resolution logic shared by `hooks/useAppTheme.ts` and `theme/paper.ts`

This slice should improve runtime reliability and reduce theme drift without changing product behavior.

## Scope

### In Scope

- Add a test-friendly repo-memory override path to `.agents/hooks/codex-autopilot.sh` while preserving current default behavior.
- Add regression coverage for fallback-memory activation during `start` and `run` flows.
- Extract shared theme-mode resolution into a single theme helper used by both `hooks/useAppTheme.ts` and `theme/paper.ts`.
- Add targeted tests for the shared theme-mode logic and the compatibility bridge behavior.

### Out of Scope

- No change to unattended automation permissions or merge policy.
- No broad Zustand store API redesign.
- No visual redesign or token changes.
- No change to product routing, auth, or backend behavior.

## Risk Tier

- Tier: `MED`
- Rationale: this slice changes a shell execution hook and a shared theme bridge used across the app, but stays within local automation reliability and UI state derivation. It does not alter backend or product logic.

## Repo Truth

- `docs/PRODUCT_PLAN.md` lists T7 as `Agent hooks and state modularity polish` targeting `.agents/hooks/codex-autopilot.sh`, `stores/*`, and `theme/paper.ts`.
- `.agents/hooks/codex-autopilot.sh` already has fallback-memory behavior, but it is not directly regression-tested and is hard to exercise deterministically against the repo memory path.
- `hooks/useAppTheme.ts` and `theme/paper.ts` both resolve theme mode from `usePreferencesStore` plus `useColorScheme`, which duplicates logic and can drift.
- Existing tests cover store persistence and token interop, but there is no targeted test for the autopilot shell hook or shared theme-mode resolution.

## Exact Files To Edit

- `docs/plans/2026-03-08-t7-autopilot-theme-hardening.md`
- `.agents/hooks/codex-autopilot.sh`
- `hooks/useAppTheme.ts`
- `theme/paper.ts`
- `theme/theme-mode.ts` (new shared helper)
- `__tests__/scripts/codexAutopilotHook.test.ts`
- `__tests__/theme/themeMode.test.ts`

## Target Behavior

### 1. Autopilot fallback is deterministic and testable

- Allow a repo-memory directory override through environment configuration used only when explicitly set.
- Keep default runtime behavior pointed at the tracked repo memory directory.
- When the repo-memory path is unusable, keep falling back to a writable temp memory directory and emit the existing degraded-mode warnings.

### 2. Theme mode resolution has one source of truth

- Move preference + system-scheme resolution into one shared helper.
- Use that helper from both `hooks/useAppTheme.ts` and `theme/paper.ts`.
- Keep exported theme objects and hook return shape unchanged.

### 3. Regression coverage exists for both paths

- Shell-hook tests prove fallback activation without mutating actual tracked repo memory files.
- Theme tests prove the same preference/scheme combination resolves identically across the shared helper and the paper bridge.

## Implementation Order

1. Finalize this plan:

```bash
npm run plan:finalize -- docs/plans/2026-03-08-t7-autopilot-theme-hardening.md "Start T7 with autopilot fallback hardening and shared theme-mode resolution"
```

2. Update `.agents/hooks/codex-autopilot.sh`.
3. Add autopilot regression tests.
4. Extract shared theme-mode helper.
5. Update `hooks/useAppTheme.ts` and `theme/paper.ts` to use the helper.
6. Add theme-mode regression tests.
7. Run targeted checks, then full validation and commit checkpoint.

## Validation Commands

Run in this order:

```bash
npm run plan:finalize -- docs/plans/2026-03-08-t7-autopilot-theme-hardening.md "Start T7 with autopilot fallback hardening and shared theme-mode resolution"
npm test -- --runInBand __tests__/scripts/codexAutopilotHook.test.ts __tests__/theme/themeMode.test.ts
npm run check:instruction-drift
npm run validate
git status --short
git diff --name-only
git diff --cached --name-only
```

Expected checkpoint decision after validation: `Commit now` if the slice passes validation and remains a coherent PR-sized batch under the repo's agent-owned checkpoint policy.

## Rollback

- Revert `.agents/hooks/codex-autopilot.sh` and its new regression tests together.
- Revert `theme/theme-mode.ts`, `hooks/useAppTheme.ts`, `theme/paper.ts`, and related tests together so theme resolution stays internally consistent.
- If needed, leave T7 open in the product plan and restart with a narrower follow-up slice.

## Done Criteria

- `.agents/hooks/codex-autopilot.sh` remains backward-compatible in normal repo usage and has deterministic fallback tests.
- `hooks/useAppTheme.ts` and `theme/paper.ts` share one mode-resolution helper.
- No user-facing theme behavior changes.
- `npm run validate` passes.

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-08T15:58:01Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260308-115801-2026-03-08-t7-autopilot-theme-hardening.md
Gemini-Review-Model: gemini-3.1-pro-preview

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-08T15:59:11Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260308-115911-2026-03-08-t7-autopilot-theme-hardening-codex-approval.md
Codex-Approval-By: Codex
