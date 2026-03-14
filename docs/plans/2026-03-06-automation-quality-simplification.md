# Automation And Quality Simplification

Status: In Progress
Risk: HIGH
Rationale: This batch changes CI workflows, repo-writing automation behavior, and local operator policy for Jules/Codex handoff.

## Summary

Simplify PR and CI remediation automation so quality remains enforced by explicit gates, while repo-writing remediation requires an explicit human trigger.

## Scope

- Make `Quality Checks` use the canonical validation command.
- Remove background PR lifecycle automation and background CI auto-heal behavior.
- Keep gatekeeper reporting, plan gate enforcement, and UI review.
- Align local Jules/Codex docs with the new manual-by-default cloud handoff policy.

## Implementation Changes

1. Workflow updates
   - `.github/workflows/lint.yml`: run `npm run validate` plus `npm run check:instruction-drift`.
   - `.github/workflows/pr-autopilot.yml`: keep explicit PR-comment/manual entrypoints only; disable lifecycle mutation.
   - `.github/workflows/ci-auto-heal.yml`: convert to manual triage with `run_id` input and read-only defaults.
   - `.github/workflows/issue-escalation.yml`: keep issue escalation, disable automatic Jules delegation and failed-job reruns.
   - `.github/workflows/jules-gatekeeper-cloud.yml`: keep report generation, remove auto-publish of completed Jules sessions.

2. Script updates
   - `scripts/pr-autopilot.mjs`: require explicit command comments and disable backlog scanning by default.
   - `scripts/ci-auto-heal.mjs`: support manual `run_id` triage and disable fixes/reruns/Jules by default.
   - `scripts/issue-escalation.mjs`: block automatic Jules delegation and failed-job reruns unless explicitly enabled, while preserving explicit `/auto-remediate` override behavior.

3. Policy/documentation updates
   - `AI_RULES.md`, `CODEX.md`, `docs/operations/agent-orchestration.md`, `docs/operations/codex-multi-agent.md`, `docs/operations/quality-gates.md`: document manual-by-default Jules usage and the CI gate matrix.

## Validation

- `npm run validate`
- `npm run check:instruction-drift`
- review the modified workflow YAML for trigger, permission, and env changes

## Rollback

- Revert the workflow/script pair together if a specific automation becomes too restrictive.
- Keep `Quality Checks`, `Plan Gate`, and `UI Review` intact even if a remediation workflow needs to be restored.

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-06T10:26:24Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260306-052624-2026-03-06-automation-quality-simplification.md
Gemini-Review-Model: gemini-3.1-pro-preview

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-06T10:27:27Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260306-052727-2026-03-06-automation-quality-simplification-codex-approval.md
Codex-Approval-By: Codex
