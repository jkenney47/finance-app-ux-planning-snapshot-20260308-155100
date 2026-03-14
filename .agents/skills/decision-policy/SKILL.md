---
name: decision-policy
description: Apply an explicit autonomous decision policy that determines what the agent should decide independently versus when user approval is required. Use when execution involves tradeoffs across risk, cost, security, data integrity, or irreversible operations.
---

# Decision Policy

## Goal

Make agent decisions consistent and auditable by applying a clear escalation policy before execution.

## Workflow

### 1) Classify the pending decision

- Determine decision type:
  - architecture
  - implementation detail
  - infrastructure/operations
  - security/privacy
  - cost/spend
  - destructive action

### 2) Score risk and reversibility

Use `references/escalation_matrix.md`.

Score each dimension (low/medium/high):

- blast radius
- reversibility
- data sensitivity
- user impact
- external cost

### 3) Apply escalation rules

Always ask for explicit user approval when any apply:

- destructive or irreversible operations.
- history rewrite or force-push style actions.
- security/secret handling changes.
- legal/compliance affecting decisions.
- paid/external spend above existing norm.

Auto-decide when:

- change is reversible.
- low blast radius.
- no sensitive data or cost impact.
- aligns with current repo policy.

### 4) Record the decision

Use `assets/decision_log_template.md` and always include:

- decision
- rationale
- risk score
- escalation outcome (`auto` or `ask`)
- next action

### 5) Execute or request approval

- If `auto`, proceed and note assumptions.
- If `ask`, present one recommended option and one fallback option.

## Quality Rules

- Prefer fewer decisions requiring user input, but never bypass high-risk gates.
- Keep rationale concrete and one paragraph max.
- If uncertain on risk classification, escalate.
