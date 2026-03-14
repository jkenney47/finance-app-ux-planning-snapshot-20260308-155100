# Agent Orchestration Runbook

Last updated: 2026-03-06
Audience: Product + Engineering operators

## What This Is

This runbook standardizes multi-agent execution for this repository:

- Codex handles planning, implementation, and review roles.
- Jules handles delegated cloud QA/CI and repetitive remediation.
- Gemini remains a read-only advisor.

`START_HERE.md` and `CODEX.md` are shortcuts only. This document is the canonical orchestration policy.
If this runbook conflicts with `AI_RULES.md`, `AI_RULES.md` wins.

## Core Role Model

### Orchestrator (Codex)

- Classifies risk tier (`LOW`, `MED`, `HIGH`) with rationale.
- Enforces required workflow based on tier.
- Owns final merged output quality.

### Planner (Codex)

- Produces decision-complete implementation packets.
- Defines acceptance criteria, validation commands, rollback notes.

### Implementer (Codex)

- Executes scoped changes with minimal diffs.
- Captures concrete verification evidence.

### Reviewer (Codex)

- Identifies regressions, policy violations, and test gaps.
- Outputs prioritized findings and merge recommendation.

### QA/CI Specialist (Jules)

- Executes delegated tests, E2E updates, and CI remediation.
- Pushes fixes only to the same working branch.

### Specialized reviewer path: CI triage (Codex)

- `ci_triage_reviewer` is an optional read-only reviewer profile for manual CI diagnosis.
- Use it to summarize likely root cause, identify missing evidence, and recommend the smallest next commands after a failed run or `ci-auto-heal` triage output.
- It does not change the repo's manual-only CI policy and does not authorize autonomous remediation.

## UI Workflow (AI-Only + Simulator/Xcode)

- Follow `docs/ux/ui-development-workflow.md` for all UI work.
- Default path is artifact-first (`npm run ui:review`) using simulator screenshots and Maestro logs.
- Strict iOS validation is required for all UI changes (device matrix, dynamic type, appearance, key states).
- If simulator/Xcode binding is flaky, run: `npm run xcode:stabilize`.

## Risk Tiers

- `LOW`: docs-only or narrow non-guarded change.
- `MED`: common UI/util/state updates with moderate regression risk.
- `HIGH`: auth, migrations, core user flows, rollout flags, or cross-surface refactors.

Requirement:

- `LOW`: single-agent execution allowed.
- `MED/HIGH`: role workflow required (`planner -> implementer -> reviewer -> orchestrator merge`).
- If tier is missing, default to `MED`.

## Product Plan Tagging Requirement

All new plan and product-plan work items must include:

- `Risk: LOW|MED|HIGH`
- one-line rationale for the selected tier

## Workflow States

Use these explicit states in handoff packets and status updates:

1. `Planned`
2. `In Progress`
3. `Human Review`
4. `Rework`
5. `Done`

## Standard Loop

1. Intake request and classify risk tier.
2. Finalize plan metadata/artifacts with `npm run plan:finalize -- <plan-file> "<summary>"`.
3. Run required Codex role workflow for the selected tier.
4. Delegate to Jules only when the user explicitly asks for cloud follow-up or the active plan includes a manual Jules handoff step.
5. Run `npm run validate`.
6. Update docs and run commit checkpoint protocol.

## Branch Lifecycle Ownership

- Codex owns commit and push timing at commit checkpoints; per-checkpoint human approval is not required.
- Codex may merge ready non-main branches when required local validation passes, hosted checks are green, and the branch is up to date with its base.
- Use the normal PR merge flow for branch integration.
- Default to squash merge in this repo because GitHub merge commits are disabled.
- Never push directly to `main`.
- If a task-specific protocol forbids merging, that protocol overrides the default merge authority.

## Handoff Packets

Use `docs/templates/handoff.md` for role handoffs.

Required packet fields:

- workflow state
- target role
- scope paths
- exact commands
- expected outputs/evidence
- stop conditions

## Validation Gates

### Required for `MED` and `HIGH`

- Active plan finalized and pointed by `.agents/plan/current-plan.txt`.
- Codex role workflow completed with review findings resolved or accepted.
- `npm run validate` passes before completion.
- UI changes include `npm run ui:review` artifacts.

### Additional for `HIGH`

- Explicit rollback and observability checklist in plan.
- If Jules is used, record the manual handoff reason and same-branch instructions in the plan or task notes.

## Delegation to Jules

Before creating a Jules session:

1. Ensure branch is not `main`/`master`.
2. Push branch remotely: `git push -u origin HEAD`.
3. Confirm the Jules daily budget is still available; this repo must stay under `100` sessions in any rolling `24`-hour window.
4. Provide branch name, exact commands, expected artifacts, and same-branch push instruction.
5. Do not include secrets, tokens, or `.env` contents.

## Gemini Boundary

- Gemini feedback is advisory until Codex verifies in code/checks.
- Gemini does not replace required Codex reviewer role for `MED/HIGH`.

## Cloud Automation Integration

Leverage existing workflows:

- `issue-autotriage.yml` for issue labeling/routing.
- `pr-autopilot.yml` for explicit PR follow-up commands only.
- `ci-auto-heal.yml` for manual CI failure triage.
- `jules-gatekeeper-cloud.yml` for recurring read-only gatekeeper artifacts.

Manual CI triage may optionally be followed by a Codex `ci_triage_reviewer` pass to produce a structured diagnosis and next-command list, but the workflow remains explicitly operator-triggered and read-only unless a human requests a broader follow-up.

### PR Autopilot precondition recovery

PR follow-up automation is no longer a background lifecycle loop.

Use it only when an operator adds an explicit PR comment command such as:

- `/pr-autopilot`
- `/autopilot`
- `/codex-pr`
- `/jules-followup`

If Jules returns `400 FAILED_PRECONDITION`, treat it as a manual review-readiness blocker:

1. Resolve the blocking review/precondition on the PR.
2. Re-trigger PR follow-up with a new explicit command comment.
3. Do not rely on automatic retries or auto-merge recovery loops.

If a Jules session is in `Awaiting User Feedback`, treat it as a manual/API unblock blocker instead of a generic control-plane outage:

1. Recheck the existing session state first; do not open fresh Jules remediation sessions while the source session is still waiting for user feedback.
2. Keep the blocker open until the tracked session moves out of `Awaiting User Feedback` or a supported publish/reply API path exists.
3. Preserve the daily Jules budget by avoiding no-op retries against manual-only blockers.

## Stop Triggers

Pause autonomous execution for:

- missing credentials or environment access,
- destructive/irreversible actions,
- unresolved production risk outside approved scope,
- explicit user stop.
