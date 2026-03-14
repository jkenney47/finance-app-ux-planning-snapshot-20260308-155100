# Codex Multi-Agent Runbook

Last updated: 2026-03-06
Audience: Codex operators in this repository

## Goal

Use this after `docs/operations/agent-orchestration.md` when Codex needs the repo-specific role workflow details.

## Risk-tier routing

- `LOW`: single-agent execution is allowed.
- `MED`: role workflow required (`planner -> implementer -> reviewer -> orchestrator merge`).
- `HIGH`: role workflow required plus explicit rollback/observability checks. Jules follow-up is optional and manual.

If a task risk tier is not specified in the active plan, default to `MED`.

## Required setup

- Repo config exists at `.codex/config.toml`.
- Role prompt files exist under `.codex/agents/`.
- Active plan is finalized before implementation-path edits.

## Workflow states

Use these explicit states in plan and handoff updates:

1. `Planned`
2. `In Progress`
3. `Human Review`
4. `Rework`
5. `Done`

## Standard command flow

### Planner pass

```bash
codex exec --profile planner "Create a decision-complete plan for <task>. Include risk tier, acceptance criteria, and validation steps."
```

### Implementer pass

```bash
codex exec --profile implementer "Execute the approved plan for <task> with minimal diffs and required validation."
```

### Reviewer pass

```bash
codex exec --profile reviewer "Review current changes for regressions, missing tests, and policy violations."
```

### Specialized reviewer variant: CI triage

Use the dedicated CI triage reviewer when the task is diagnosing failed checks rather than reviewing a code diff end to end:

```bash
codex exec --profile ci_triage_reviewer "Diagnose this failed CI run, summarize likely root cause, and list the smallest next commands to verify it."
```

Use this profile only for manual, read-only triage. It does not replace the required generic reviewer role for broader `MED/HIGH` implementation review.

## Safety boundaries

- Sub-agent sandbox/approval settings must not exceed orchestrator safety posture.
- Never include secrets, `.env` values, or tokens in agent prompts.
- Codex orchestrator remains responsible for final merged output quality.

## Fallback behavior

If profile-based role execution is unavailable:

1. Run equivalent role passes manually in sequence.
2. Record fallback reason in task notes.
3. Keep `MED/HIGH` review rigor unchanged.

## Relationship to Jules and Gemini

- Jules: cloud QA/CI specialist for explicitly requested follow-up after Codex role synthesis.
- Gemini: read-only advisor; findings are advisory until verified by Codex in code and checks.
