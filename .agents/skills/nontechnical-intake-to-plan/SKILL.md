---
name: nontechnical-intake-to-plan
description: Convert plain-language, nontechnical requests into an actionable engineering plan with milestones, assumptions, acceptance criteria, and implementation order. Use when a user describes what they want without technical details and needs the agent to drive architecture and execution decisions.
---

# Nontechnical Intake To Plan

## Goal

Turn a user request into a plan that can be executed immediately, even when the user provides minimal technical detail.

## Inputs

Gather the minimum:

1. User outcome in plain language.
2. Constraints (time, budget, compatibility, compliance).
3. Current system context (if available).

If missing, ask only 1-3 high-value questions from `references/triage_questions.md`.

## Workflow

### 1) Translate request into execution objective

- Write one objective sentence in the format:
  - "Deliver `<capability>` for `<user>` with `<success outcome>`."
- State explicit non-goals.

### 2) Detect complexity level

- Use `references/complexity_rubric.md`.
- Assign `small`, `medium`, or `large`.
- Use complexity to set milestone count:
  - small: 2-3 milestones
  - medium: 3-5 milestones
  - large: 5-8 milestones

### 3) Make assumptions and decisions explicit

- List assumptions with confidence.
- Identify decisions the agent can make now versus decisions requiring user confirmation.
- If a decision is high-risk, route through `$decision-policy`.

### 4) Produce deterministic plan output

Use `assets/intake_execution_plan_template.md`.

Always include:

- objective
- constraints
- assumptions table
- milestone plan
- acceptance criteria
- risk register summary
- first implementation step

Use `assets/acceptance_criteria_template.md` for acceptance criteria wording.

### 5) Confirm and proceed

- End with a plain confirmation:
  - "I can execute this plan now. Proceed?"
- If the user confirms, begin implementation from milestone 1.

## Quality Rules

- Prefer concrete defaults over open-ended options.
- Keep decision language plain and nontechnical.
- Avoid more than three clarification questions unless blocked.
- Do not present architecture alternatives unless they change cost, timeline, or risk materially.
