# Execution Packet: CI Triage Reviewer Profile

Date: 2026-03-08
Owner: Product + Engineering
Status: Done

## Links

- Agent ops report: `docs/reports/agent-ops-latest.md`
- Canonical orchestration policy: `docs/operations/agent-orchestration.md`
- Repo-specific multi-agent runbook: `docs/operations/codex-multi-agent.md`
- Active plan pointer (update before implementation): `.agents/plan/current-plan.txt`

## Goal Summary

Add a small, safe CI-triage specialist to the repo's Codex role system so operators have a dedicated read-only reviewer path for failed checks. This should improve diagnosis quality without changing the repo's current manual-only CI triage policy or introducing autonomous write behavior.

## Scope

### In Scope

- Add a dedicated `ci_triage_reviewer` profile to `.codex/config.toml`.
- Add a repo-local prompt file for the profile under `.codex/agents/`.
- Update runbooks so operators know when to use the profile during manual CI triage.
- Keep the slice tightly aligned with the current `ci-auto-heal` manual-triage workflow.

### Out of Scope

- No changes to `.github/workflows/ci-auto-heal.yml`.
- No changes to `scripts/ci-auto-heal.mjs`.
- No changes to unattended automation behavior, write permissions, or Jules delegation rules.
- No widening of multi-agent parallelism or delegation depth.

## Risk Tier

- Tier: `MED`
- Rationale: this changes the repo's multi-agent profile surface and operator workflow, but stays limited to config, prompt, and docs. It does not alter production code, CI write behavior, or unattended automation permissions.

## Repo Truth

- `docs/reports/agent-ops-latest.md` currently recommends a `ci_triage_reviewer` profile because CI/check incidents are frequent.
- `docs/reports/agent-ops-latest.md` also recommends `max_parallel_threads: 1` and `max_delegation_depth: 1`, so this slice must not broaden concurrency.
- `docs/operations/agent-orchestration.md` defines `ci-auto-heal.yml` as manual CI failure triage.
- `scripts/ci-auto-heal.mjs` already defaults to read-only diagnosis:
  - deterministic fixes disabled by default
  - failed-job reruns disabled by default
  - Jules remediation disabled by default
  - PR comments disabled by default

## Exact Files To Edit

- `docs/plans/2026-03-08-ci-triage-reviewer-execution-packet.md`
- `.codex/config.toml`
- `.codex/agents/ci-triage-reviewer.md`
- `docs/operations/codex-multi-agent.md`
- `docs/operations/agent-orchestration.md`

## No-Change Decision

- Do not edit `.github/workflows/ci-auto-heal.yml` in this slice.
- Do not edit `scripts/ci-auto-heal.mjs` in this slice.
- Do not manually edit `docs/reports/agent-ops-latest.md` or `docs/reports/agent-ops-latest.json`.

## Target Behavior

### 1. New profile exists

- Add `agents.ci_triage_reviewer` and `profiles.ci_triage_reviewer` to `.codex/config.toml`.
- The profile remains read-only.
- The profile remains reviewer-shaped, not implementer-shaped.

### 2. Prompt is narrow and deterministic

- Create `.codex/agents/ci-triage-reviewer.md`.
- Scope it to:
  - diagnose failing CI/check output
  - summarize likely root cause
  - map failures to next commands
  - call out missing evidence
  - identify when the operator should escalate to a broader reviewer or implementer pass
- Explicitly forbid merge, push, rerun, fix, or Jules delegation recommendations unless the human/operator asks separately.

### 3. Runbooks explain when to use it

- `docs/operations/codex-multi-agent.md` documents `ci_triage_reviewer` as an optional specialized reviewer path for manual CI triage.
- `docs/operations/agent-orchestration.md` documents that operators can use this profile after `ci-auto-heal` or direct failing-check inspection to produce a structured diagnosis.

### 4. Policy remains unchanged

- `ci-auto-heal.yml` remains manual triage only.
- No auto-merge, no push to `main`, no autonomous remediation loops, and no concurrency expansion are introduced.

## Implementation Order

1. Add this execution packet.
2. Finalize the plan:

```bash
npm run plan:finalize -- docs/plans/2026-03-08-ci-triage-reviewer-execution-packet.md "Add read-only ci_triage_reviewer profile and docs"
```

3. Update `.codex/config.toml`.
4. Add `.codex/agents/ci-triage-reviewer.md`.
5. Update `docs/operations/codex-multi-agent.md`.
6. Update `docs/operations/agent-orchestration.md`.
7. Re-run the agent ops report so generated recommendations reflect the new profile.
8. Run validation and checkpoint commands.

## Validation Commands

Run in this order:

```bash
npm run plan:finalize -- docs/plans/2026-03-08-ci-triage-reviewer-execution-packet.md "Add read-only ci_triage_reviewer profile and docs"
npm run agent:ops:report
npm run check:instruction-drift
npm run validate
git status --short
git diff --name-only
git diff --cached --name-only
```

Expected checkpoint decision after validation: `Commit now` if the slice passes validation and remains a coherent PR-sized batch under the repo's agent-owned checkpoint policy.

## Rollback

- Revert `.codex/config.toml` and remove `.codex/agents/ci-triage-reviewer.md` together.
- Revert the two runbook edits together so docs do not reference a missing profile.
- Re-run `npm run agent:ops:report` after rollback so generated artifacts return to the prior state.

## Done Criteria

- `ci_triage_reviewer` is defined in `.codex/config.toml`.
- `.codex/agents/ci-triage-reviewer.md` exists and is explicitly read-only in scope.
- Runbooks document the profile as a manual CI triage aid, not a new autonomous automation.
- `docs/reports/agent-ops-latest.md` no longer recommends creating `ci_triage_reviewer`.
- No unattended write behavior is added.
- `npm run validate` passes.

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-08T12:24:26Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260308-082426-2026-03-08-ci-triage-reviewer-execution-packet.md
Gemini-Review-Model: gemini-3.1-pro-preview

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-08T12:25:14Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260308-082514-2026-03-08-ci-triage-reviewer-execution-packet-codex-approval.md
Codex-Approval-By: Codex
