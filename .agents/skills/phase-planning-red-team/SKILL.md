---
name: phase-planning-red-team
description: Run an adversarial, dependency-first planning interview that turns rough phase ideas into execution-ready plans with explicit assumptions, risks, validation gates, and rollback paths. Use when planning or reviewing a development phase, when plan quality must be airtight, or when stakeholders want rigorous branch-by-branch questioning before implementation.
---

# Phase Planning Red Team

## Goal

Create an airtight phase plan by resolving design and delivery dependencies one-by-one before implementation starts.

## Operating Mode

Use a skeptical reviewer stance:

- Treat every assumption as a potential failure mode until proven safe.
- Ask dependency-first questions, not admin questions.
- Propose a default recommendation for each decision.
- Resolve dependencies in order; do not jump to downstream branches early.

If the user says "use your judgment," decide and continue, but record confidence and risk.

### Execution Modes

- `Interactive branch-by-branch`: ask one unresolved critical question at a time.
- `Autonomous sweep` (default when user asks for speed): resolve the full tree using recommended defaults, then surface only blocking questions.

In `Autonomous sweep`, do not stop for low-risk preference questions.

## Inputs

Load only what is needed:

1. Primary plan source (prefer `docs/PRODUCT_PLAN.md` in this repo).
2. Active architecture context (`docs/SYSTEM_MAP.md`, relevant implementation docs).
3. User direction from the current conversation.

## Workflow

### 1) Start a Decision Ledger

Track every branch in a ledger with these fields:

- `Decision ID`
- `Branch`
- `Question`
- `Recommended default`
- `User response`
- `Status` (`resolved` | `provisional` | `open`)
- `Confidence` (`high` | `medium` | `low`)
- `Downstream dependencies unlocked`

### 2) Traverse the Dependency Tree

Use `references/dependency-tree.md` and walk in order.

Per node:

1. Set recommended default and one-line rationale.
2. In `Interactive` mode: ask and capture response.
3. In `Autonomous sweep` mode: adopt the default unless a blocker threshold is hit.
4. Mark status and unlock only the child branches enabled by that answer.
5. Continue until all critical branches are resolved or explicitly blocked.

Critical branches may be `provisional` only if there is a written fallback and rollback plan.

Blocker threshold in `Autonomous sweep`:

- legal/compliance exposure
- security/privacy risk with no acceptable default
- irreversible migration/destructive operation
- product-direction fork with materially different user outcome

### 3) Run Red-Team Review

Use `references/red-team-checklist.md` after the initial branch pass.

- Run feasibility, risk, security/privacy, operational, and delivery stress tests.
- Convert each failed check into a concrete plan change.
- Re-open upstream branches if a red-team finding invalidates an earlier decision.

### 4) Produce Deterministic Output

Render the final plan using `assets/phase-plan-template.md`.

Required outputs:

- decision ledger summary
- execution plan
- dependency map
- risk register
- validation matrix
- rollback matrix
- unresolved items (if any) with explicit owner and due condition

### 5) Gate for Plan Approval

Do not approve the plan unless all are true:

- No `open` critical decisions remain.
- Each milestone has explicit entry criteria and exit criteria.
- Each dependency has owner, artifact, and verification check.
- Each high-risk item has both mitigation and rollback.
- Validation steps are objective (pass/fail), not subjective.

## Interview Rules

- Keep questions concrete and singular.
- Prefer "confirm or correct this default" phrasing.
- In `Interactive` mode, ask one unresolved critical question at once.
- In `Autonomous sweep`, batch only blocker questions and keep the set minimal.
- Skip naming/timebox prompts unless they materially change architecture, cost, or risk.
- When answers conflict, surface the contradiction and force explicit resolution.

## Blocker Packet Format (Autonomous Sweep)

When surfacing questions after an autonomous pass, use this shape:

- `Decision`: short label
- `Why it blocks`: one sentence
- `Recommended default`: one sentence
- `Options`: minimal set, mutually exclusive

## Completion Criteria

This skill is complete for a run only when:

- critical dependencies are resolved
- red-team checks pass or have approved compensating controls
- final output is produced in the template format
- first implementation slice is identified with verifiable acceptance gates
