# Plan: Multi-Agent Orchestration Setup (PM + Specialists + Gates)

Date: 2026-03-03
Owner: Product + Engineering
Status: Draft

## Links

- Issue: N/A
- PR: N/A
- Active plan pointer: `.agents/plan/current-plan.txt`

## Scope

### In Scope

- Add a repository runbook for PM-style agent orchestration.
- Add reusable templates for decision-complete plans and handoff packets.
- Update docs index to include orchestration artifacts.
- Finalize this plan with review metadata and Codex final approval metadata.

### Out of Scope

- No application runtime code changes.
- No new cloud services or external tooling.
- No workflow behavior rewrites for existing GitHub Actions.

## Risk Tier

- Tier: `MED`
- Rationale: Docs and process changes can affect execution quality and guard-rail compliance, but no runtime behavior is modified.

## Target Paths

- `docs/operations/agent-orchestration.md`
- `docs/templates/agent-spec.md`
- `docs/templates/handoff.md`
- `docs/README.md`
- `docs/plans/2026-03-03-agent-orchestration-plan.md`

## User-Facing States (Required If UI Touched)

- Not applicable. No UI surface is changed.

## Accessibility (Required If UI Touched)

- Not applicable. No UI surface is changed.

## Implementation Steps

1. Create orchestration runbook documenting roles, risk tiers, handoffs, gates, and stop triggers.
2. Create standardized templates for plan creation and specialist handoffs.
3. Update docs index so operators can find the new runbook/templates quickly.
4. Run `npm run plan:finalize` on this plan to generate review and Codex artifacts and update the active plan pointer.
5. Run `npm run validate` to satisfy completion gate before reporting done.

## Test Plan

- Jest updates: none expected.
- Maestro updates: none expected.
- Manual smoke checks:
  - Confirm new docs files exist at expected paths.
  - Confirm plan metadata sections are appended to this plan after finalization.
  - Confirm `.agents/plan/current-plan.txt` points to this plan file.

## Rollback

- Primary rollback path: revert the docs commit that introduced orchestration files.
- Fallback path: set active plan pointer back to `docs/PRODUCT_PLAN.md` via `npm run plan:finalize -- docs/PRODUCT_PLAN.md "<summary>"` if needed.

## Observability

- Verify artifact creation under:
  - `artifacts/plan-reviews/`
  - `artifacts/codex-approvals/`
- Verify metadata in finalized plan:
  - `Review-*`
  - `Codex-Approval-*`

## Delegation

- Plan reviews to run:
- Plan critique through `npm run plan:finalize` (which invokes `plan:review`).
- Jules handoff required: no.

## Review Metadata

Review-Timestamp: 2026-03-03T01:43:05Z
Review-Artifact: artifacts/plan-reviews/20260302-204305-2026-03-03-agent-orchestration-plan.md
Review-Model: legacy-review-model

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-03T01:43:05Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260302-204305-2026-03-03-agent-orchestration-plan.md
Gemini-Review-Model: legacy-review-model

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-03T01:43:27Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260302-204327-2026-03-03-agent-orchestration-plan-codex-approval.md
Codex-Approval-By: Codex
