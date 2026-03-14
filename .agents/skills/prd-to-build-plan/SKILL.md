---
name: prd-to-build-plan
description: Convert a PRD into an MVP-first, execution-ready build plan with milestones, sequenced tasks, dependencies, risks, and a definition of done.
---

# PRD To Build Plan

## Goal

Turn a PRD into a practical build plan that a small team can execute immediately and non-technical stakeholders can follow.

## Install Path

- Preferred repo-local path: `.agents/skills/prd-to-build-plan/SKILL.md`
- Global fallback path (if installed): `$CODEX_HOME/skills/prd-to-build-plan/SKILL.md`

## When To Use

- You have a PRD and need an implementation plan.
- You need strict MVP scoping to avoid overbuilding.
- You need a phased roadmap (`MVP -> V1 -> V2`) with risks and acceptance criteria.

## Required Inputs

- PRD-equivalent requirements content (pasted text or sourced from a local file in prompt context).
- Hard constraints: deadline, budget, required stack, compliance/security constraints.

In Finance-App, PRD-equivalent input may be a paired source:

- `/docs/PRODUCT_PLAN.md` for active scope, sequencing, status, and definition of done
- `/docs/architecture/ai-financial-advisor-design-doc.md` for product vision, UX principles, and system/experience direction

If details are missing, ask at most 3 blocking questions from `references/blocking_questions.md`. If still unanswered, continue using explicit assumptions.

## Finance-App Source Discovery

Use this discovery order when a source file is not provided explicitly:

1. `/docs/PRODUCT_PLAN.md` (canonical execution source in this repo)
2. `/docs/architecture/ai-financial-advisor-design-doc.md` (companion design/context source in this repo)
3. `/docs/PRD.md`
4. `/PRD.md`
5. Any file in `/docs` with `prd` in the filename (case-insensitive); if multiple exist, pick the most recently modified

If no source is found, return a short note listing exactly which paths were checked and do not generate a build plan.

If the selected source set is unchanged since the last run, archive the run and produce no output.

For Finance-App, do not collapse the product plan and design doc into one implied source. Use:

- `docs/PRODUCT_PLAN.md` for active implementation scope, ordering, status, and done-state
- `docs/architecture/ai-financial-advisor-design-doc.md` for product goals, UX principles, and system intent

If the two sources conflict, call out the mismatch explicitly in `Assumptions & Open Questions` instead of silently choosing one interpretation.

## Workflow

### 1) Intake and Normalize

- Extract product goal, primary user, and primary job-to-be-done.
- Extract constraints and non-goals.
- Identify unclear areas that block scope or sequencing.

### 2) Resolve Blockers Only

- Ask only high-impact blocking questions.
- Maximum of 3 questions.
- If unanswered, proceed with defaults and record assumptions.

### 3) Scope MVP First

Apply the `MVP Guardrails` checklist:

- MVP must support one end-to-end primary user flow.
- Include one happy path and one failure path per major flow.
- Defer non-essential complexity to `V1` or `V2`.
- If an integration is complex, include:
  - `A` mocked/stubbed MVP fallback
  - `B` real integration plan in a later milestone

### 4) Produce Deterministic Output

- Use `assets/prd_build_plan_template.md`.
- Keep section order and headings exactly.
- Fill every section; no omitted headings.

### 5) Apply Repo Adapter (Optional)

If the project context indicates `Expo Router + React Native + Supabase + Zustand`, include implementation-specific details in the plan:

- Route and screen work in `app/`
- Shared UI in `components/`
- State in `stores/`
- Domain/service logic in `utils/`
- Backend logic in `supabase/functions/`
- DB changes in `supabase/migrations/`
- Shared types in `types/`
- Tests in `__tests__/`
- Validation gates: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run validate`

### 6) Run Self-Check

- Validate the draft using `references/self_check_rubric.md`.
- If any item fails, revise once before final output.

## Output Rules

- Keep it concrete and implementation-ready.
- Prefer smallest coherent MVP on ambiguity.
- Minimize new dependencies and vendors unless clearly justified.
- Include security-by-default requirements for authn, authz, secrets handling, and sensitive logging.
- Keep language concise and specific; avoid filler.

## Task Schema (Mandatory)

Every task in the execution plan must include:

- `Title`
- `Objective` (1-2 lines)
- `Target Area (paths)`
- `Inputs/Dependencies`
- `API/Data Touches`
- `Output/Artifacts`
- `Test/Verification`
- `Rollback Note`
- `Effort (S/M/L)`

## Finalization

- End with `Next 48 Hours` as an ordered list of 5-10 actions.
- If unresolved blockers remain, list them in `Assumptions & Open Questions` with `Blocking MVP` priority labels.
