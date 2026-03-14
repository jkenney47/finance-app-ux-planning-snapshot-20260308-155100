---
name: assumption-first-redesign
description: Redesign a system as if a newly proposed constraint, capability, or requirement had been true from day one. Use when asked to re-architect substantial flows, data models, API boundaries, or module boundaries, and when a clean target design plus realistic migration plan is needed. Avoid for small bug fixes or isolated incremental edits.
---

# Assumption-First Redesign

## Goal

Produce a clean target architecture that would have been the obvious design if the new assumption had existed from day one, then back-cast an incremental migration from the current system.

## Step 0: Fit Gate (Redesign vs Incremental)

Run this gate before the full workflow.

Choose `incremental` if all are true:

- change is localized to one bounded area.
- no ownership boundary changes are required.
- no new foundational invariants are introduced.
- compatibility can be preserved with straightforward edits.

Choose `assumption-first redesign` if any are true:

- change introduces a new primary invariant or business model.
- change requires reassigning source-of-truth ownership.
- change alters API/data boundaries across multiple modules.
- change imposes new reliability/security/regulatory constraints.
- existing architecture would require repeated exceptions or shims.

Always output a short gate decision:

- `Decision`: `incremental` or `assumption-first redesign`
- `Why`: two to four bullet points

If decision is `incremental`, stop and provide a concise incremental plan instead of the redesign workflow.

## Minimum Inputs

Collect only what is needed to proceed:

1. Proposed change phrased in plain language.
2. Current system snapshot (structure, core flows, runtime, data stores, external dependencies).
3. Constraints (must-keep behavior, compatibility, performance, security, regulatory, timeline, risk tolerance).

If inputs are missing, ask the smallest set of clarifying questions.

## Workflow

If Step 0 chooses redesign, follow the steps in order.

### 1) Normalize the change into foundational assumptions

- Convert each change into concise statements:
  - From day one, the system must ...
  - The system is constrained by ...
  - The system optimizes for ...
- Record:
  - assumptions
  - invariants
  - non-goals

### 2) Design clean-slate target architecture

Ignore the current implementation for this step.

- Define primary units of change (bounded contexts, modules, services).
- Define data ownership and lifecycle (writers, readers, source of truth).
- Define contracts (API, events, schema boundaries).
- Pick the simplest architecture that satisfies assumptions.
- State non-functional targets (latency, throughput, reliability, cost, security).

Output a target design that is simple and predictable in hindsight.

### 3) Run an elegance pass

Remove complexity inherited from legacy constraints:

- collapse layers with low leverage.
- remove duplicate sources of truth.
- replace scattered conditionals with explicit invariants.
- replace ad-hoc cross-calls with clear boundaries.

### 4) Build the gap map (current -> target)

For each current component, classify:

- Keep
- Replace
- Delete
- Introduce

Include role changes, interface breaks, and data migration implications.

### 5) Build migration plan

Prefer incremental migration unless explicitly forced into big-bang.

- Use strangler pattern for parallel old/new paths.
- Use compatibility shims at stable boundaries.
- Use staged data migration with backfill and verification.
- Use feature flags, dual-write, shadow-read only when they reduce risk.
- Define per-stage done criteria and rollback criteria.

### 6) Produce deterministic deliverables

Use templates in `assets/`:

- `assets/redesign_brief_template.md`
- `assets/migration_plan_template.md`
- `assets/adr_template.md`
- `assets/risk_register_template.md`

Always deliver:

- redesign brief using the exact heading order in `assets/redesign_brief_template.md`.
- architecture diagram (Mermaid acceptable).
- contract change table with columns:
  - surface
  - current contract
  - target contract
  - compatibility strategy
  - cutover stage
- gap map table with columns:
  - current component
  - target component
  - action (Keep/Replace/Delete/Introduce)
  - interface break
  - data migration impact
- staged migration plan using the exact stages in `assets/migration_plan_template.md`.
- risk register using `assets/risk_register_template.md`.
- exactly three ADRs unless the user requests a different count.

Name ADRs consistently:

- `ADR-001`
- `ADR-002`
- `ADR-003`

### 7) Validate

Run `references/checklist.md`.

If gaps remain, revise target design first, then migration details.

## Multi-change Requests

When multiple major changes are requested:

1. Execute steps 1-3 for each change independently.
2. Merge assumptions and resolve conflicts explicitly.
3. Produce one integrated target design and migration path.

Resolve assumption conflicts using this precedence order:

1. Safety, security, regulatory constraints.
2. Data integrity and correctness invariants.
3. External compatibility commitments.
4. Reliability and operability targets.
5. Delivery speed and cost.
6. Developer ergonomics.

When tradeoffs remain, output two options and recommend one using the precedence order.

## Implementation Mode (When Asked To Apply)

- Prefer multiple small PRs over a single large PR.
- Preserve backward compatibility until cutover stages complete.
- Add characterization tests before refactoring critical behavior.

## Supporting Resources

- Use `scripts/snapshot_repo.sh` to capture repeatable context before redesign.
- Use `scripts/init_redesign_bundle.sh` to generate a working deliverables pack.
- Use `references/checklist.md` for final quality gates.
- Use `references/offline_first_worked_example.md` to calibrate output style.
