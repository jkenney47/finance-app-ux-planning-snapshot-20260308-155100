# Phase Plan (Red-Team Approved)

## 1. Objective and Non-Goals

- Objective: Deliver a deterministic recommendation system that outputs either `Act now` or `Hold steady`, with transparent gate triggers and consistent behavior across core dashboard surfaces.
- Primary user outcome: Users receive clear guidance without forced weekly action, including explicit "what would trigger the next action" conditions when no action is currently recommended.
- Primary operational/business outcome: Recommendation quality and consistency improve while preserving mock-first resilience and avoiding speculative actions under low confidence.
- Non-goals:
  - New external integrations/vendors
  - Major onboarding rewrite
  - New autonomous agent workflows
  - Portfolio trading/execution flows
  - Android-specific parity expansion beyond current behavior

## 2. Decision Ledger Summary

| Decision ID | Branch            | Decision                                                                                             | Status   | Confidence | Dependencies Unlocked |
| ----------- | ----------------- | ---------------------------------------------------------------------------------------------------- | -------- | ---------- | --------------------- |
| A1          | Outcome           | Valid recommendation states are `Act now` and `Hold steady`; no forced weekly action                 | resolved | high       | A2-A3, B\*            |
| A2          | Outcome           | `Hold steady` always shows next milestone gate + trigger conditions                                  | resolved | high       | B*, G*                |
| A3          | Anti-outcomes     | Prevent low-confidence actions, missing triggers, cross-screen conflicts, hidden assumptions         | resolved | high       | F*, G*                |
| B1          | Scope             | Include mode model, trigger logic, gate visibility, confidence/assumptions, cross-screen consistency | resolved | high       | C*, D*                |
| B2          | Scope             | Defer integrations/onboarding rewrite/agent workflows/trading/Android expansion                      | resolved | high       | C*, D*                |
| B3          | Integrations      | Use existing data/mock-safe paths; insufficient data defaults to `Hold steady`                       | resolved | high       | C3, F1                |
| C1          | Contract          | Single shared decision object reused by Home/Journey/Insights                                        | resolved | high       | D*, E*                |
| C2          | Boundaries        | Deterministic engine source of truth; add optional local-only stage input as soft signal             | resolved | medium     | D*, E*                |
| C3          | Failure model     | Missing/stale/conflicting data -> `Hold steady` + explicit unlock conditions                         | resolved | high       | F*, G*                |
| C4          | Security/privacy  | Stage stays local; logs exclude sensitive payloads; backend persistence deferred                     | resolved | high       | F*, G*                |
| D1          | Sequencing        | 4 milestones: contract -> UI consistency -> stage input -> validation/rollout                        | resolved | high       | E*, G*                |
| E1          | Task map          | Contract/engine/selector/UI/stage/tests task map confirmed                                           | resolved | high       | execution plan        |
| E2          | Data/API          | No new endpoints, migrations, or edge functions this phase                                           | resolved | high       | rollout simplicity    |
| E3          | Rollout           | Flagged release, dark launch, dev/test cohort first, flag-off rollback                               | resolved | high       | go/no-go              |
| F1          | Confidence gate   | `Act now` requires confidence >= 0.72 and no critical missing data                                   | resolved | medium     | engine logic, tests   |
| F2          | Stage UX          | Stage selector in Profile/Preferences + lightweight Home entry                                       | resolved | medium     | UI scope              |
| F3          | Conflict behavior | Stage/data conflicts show reconcile prompt and keep `Hold steady`                                    | resolved | high       | failure safety        |

## 3. Scope Definition

- In scope:
  - Deterministic recommendation mode model (`act_now` / `hold_steady`)
  - Trigger-condition visibility and milestone-gate transparency
  - Confidence and assumptions disclosures
  - Cross-screen consistency contract and rendering
  - Optional local-only financial stage input + conflict handling
- Out of scope:
  - New integrations, schema/API expansion, major onboarding refactor, trading flows, Android expansion
- Required integrations now:
  - None beyond existing app data/evaluation pipeline
- Deferred integrations and fallback strategy:
  - Backend stage persistence deferred; local-only storage now
  - If data quality is insufficient, use `Hold steady` with explicit unlock triggers

## 4. Milestone Plan

### Milestone 1

- Objective: Establish shared recommendation contract and deterministic mode output.
- Entry criteria:
  - Existing engine tests pass
  - Current consumer call-sites mapped
  - Backward-compat adapter path defined
- Exit criteria:
  - Engine emits new decision object with mode/triggers/confidence/assumptions/gates
  - Existing consumers compile via adapter or migration
  - Unit tests cover `Act now`, `Hold steady`, and missing-data fallback
- Dependencies: Existing FME contracts and evaluation flow
- Owner: Codex implementation, user approval on behavior
- Artifacts: Updated contracts/types, engine logic, adapter, focused tests
- Verification: Unit test suite + typecheck/lint
- Rollback: Re-enable prior contract adapter path and disable new mode rendering flag

### Milestone 2

- Objective: Enforce cross-screen consistency for Home/Journey/Insights.
- Entry criteria:
  - Milestone 1 exit criteria complete
  - Shared decision selector/hook available
  - Copy rules for both modes defined
- Exit criteria:
  - All three screens render from same decision object
  - No contradictory state across surfaces for same snapshot
  - `Hold steady` always includes trigger conditions
  - Consistency tests pass
- Dependencies: Milestone 1 contract and selector
- Owner: Codex implementation, user approval on UX wording
- Artifacts: Selector/hook, updated screens/components, consistency tests, copy updates
- Verification: Component/integration tests + manual smoke on dashboard surfaces
- Rollback: Toggle feature flag off and keep legacy rendering paths

### Milestone 3

- Objective: Add optional local-only stage signal with safe personalization.
- Entry criteria:
  - Milestone 2 consistency checks passing
  - Local storage schema for stage input defined
  - Stage influence rules documented (soft signal only)
- Exit criteria:
  - Optional stage set/update UX works
  - Decision logic handles stage-present and stage-absent paths
  - Conflict path shows reconcile prompt and keeps `Hold steady`
  - Tests pass for baseline, personalization, and conflict scenarios
- Dependencies: Milestone 2 shared decision pipeline
- Owner: Codex implementation, user approval on interaction behavior
- Artifacts: Store updates, stage UI, personalization hook, conflict UX copy, tests
- Verification: Unit/component coverage + scenario matrix checks
- Rollback: Disable stage influence flag and fall back to baseline decision behavior

### Milestone 4

- Objective: Harden rollout quality and finalize validation evidence.
- Entry criteria:
  - Milestones 1-3 complete
  - Scenario matrix defined
  - Flagged rollout strategy selected
- Exit criteria:
  - Scenario matrix passes including missing/conflicting data cases
  - `npm run validate` passes
  - Rollout flag on/off behavior verified
  - Docs/release notes updated
- Dependencies: Completed implementation from prior milestones
- Owner: Codex implementation, user go/no-go approval
- Artifacts: Scenario matrix, validation evidence, rollout checklist, updated docs
- Verification: Full validation gate + targeted UX checks
- Rollback: Flag-off immediate rollback with no schema/API dependency

## 5. Execution Task Map

| Task                                        | Target Area (paths)                                                                                               | Inputs/Dependencies                | API/Data Touches              | Output/Artifacts                            | Verification                               | Effort |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------- | ------------------------------------------- | ------------------------------------------ | ------ |
| Extend decision contracts                   | `utils/contracts/fme.ts` and related shared types                                                                 | Confirmed C1 contract              | None                          | New typed decision model                    | `npm run typecheck` + contract tests       | M      |
| Update deterministic engine outputs         | `utils/domain/fme/engine.ts` and helpers                                                                          | Contract updates + confidence gate | Existing evaluation data only | Mode/triggers/confidence/assumptions output | Unit tests for mode selection and fallback | M      |
| Add shared decision selector/adapter        | shared query/helper paths used by dashboard surfaces                                                              | Engine output ready                | None                          | Unified consumer interface                  | Integration tests for consistent inputs    | S      |
| Update Home/Journey/Insights rendering      | `app/(dashboard)/index.tsx`, `app/(dashboard)/journey.tsx`, `app/(dashboard)/insights.tsx`, supporting components | Selector/adapter available         | Read-only decision object     | Consistent mode + trigger rendering         | Component tests and manual smoke           | M      |
| Add optional stage input + local store      | `stores/*` + chosen UI surfaces                                                                                   | C2/C4 rules                        | Local persistence only        | Stage preference UX + state                 | Tests for set/update/reload behavior       | M      |
| Implement stage conflict handling           | decision-consumption hooks/components                                                                             | Stage input + decision object      | None                          | Reconcile prompt and safe fallback          | Scenario tests for conflict path           | S      |
| Finalize validation matrix + rollout checks | test/docs/release workflow paths                                                                                  | Prior milestones complete          | None                          | Evidence pack + checklist                   | `npm run validate` + rollout flag checks   | S      |

## 6. Risk Register

| Risk                                        | Type                  | Impact | Likelihood | Mitigation                                                   | Detection                                           | Rollback Trigger                                      |
| ------------------------------------------- | --------------------- | ------ | ---------- | ------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------- |
| Wrong mode classification near threshold    | Technical             | High   | Medium     | Confidence gate >= 0.72 + missing-data guardrails + tests    | Mode distribution anomalies, failing scenario tests | Unexpected low-confidence `Act now` outputs           |
| Missing trigger conditions in `Hold steady` | UX/Logic              | High   | Medium     | Required-field contract + rendering asserts                  | Snapshot/component test failures                    | Any screen renders hold state without trigger details |
| Cross-screen recommendation drift           | Delivery/Architecture | High   | Medium     | Single selector/decision source + consistency tests          | Cross-surface mismatch tests                        | Conflicting state in same data snapshot               |
| Stage signal over-influences recommendation | Product               | Medium | Medium     | Soft-signal-only rule + conflict prompt + no override policy | Scenario tests for sparse/conflicting data          | Stage causes action contrary to hard facts            |
| Sensitive data leakage in logs              | Security/Privacy      | High   | Low        | Metadata-only logging + explicit redaction discipline        | Log payload audits                                  | Sensitive payload observed in logs                    |

## 7. Validation Matrix

| Check                    | Command or Method                         | Pass/Fail Rule                                              | Artifact                              |
| ------------------------ | ----------------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| Type safety              | `npm run typecheck`                       | Zero TS errors                                              | Command output                        |
| Lint/style               | `npm run lint` and `npm run format:check` | Zero errors/warnings                                        | Command output                        |
| Contract/engine behavior | Jest unit tests for decision modes        | All tests pass                                              | Test logs in `__tests__/utils/*`      |
| Cross-screen consistency | Component/integration tests               | Same input yields same mode/triggers on all surfaces        | Test logs in `__tests__/components/*` |
| Scenario resilience      | Scenario matrix execution                 | Happy + failure paths pass (`missing`, `stale`, `conflict`) | Scenario report/checklist             |
| Full repo gate           | `npm run validate`                        | Full gate passes                                            | Validation output                     |
| Rollout controls         | Flag on/off smoke checks                  | Both states safe and reversible                             | Rollout checklist                     |

## 8. Open Items

- Open critical items: None.
- Assigned owner: N/A.
- Resolution condition: N/A.
- Blocking status: Unblocked for implementation.

## 9. Go/No-Go Decision

- Decision: GO for implementation.
- Rationale: Critical planning dependencies are resolved, risk mitigations are explicit, validation and rollback paths are defined, and rollout is reversible via feature flag.
- First implementation slice: Milestone 1 contract + engine output update with threshold and fallback tests.

## Review Metadata

Review-Timestamp: 2026-03-04T01:51:54Z
Review-Artifact: artifacts/plan-reviews/20260303-205154-2026-03-03-recommendation-state-red-team-phase-plan.md
Review-Model: legacy-review-model

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-04T01:51:54Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260303-205154-2026-03-03-recommendation-state-red-team-phase-plan.md
Gemini-Review-Model: legacy-review-model

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-04T01:53:04Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260303-205304-2026-03-03-recommendation-state-red-team-phase-plan-codex-approval.md
Codex-Approval-By: Codex
