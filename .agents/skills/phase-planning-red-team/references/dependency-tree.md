# Dependency Tree

Use this order. Do not skip ahead.

## A. Outcome Definition (Root)

Purpose: prevent planning work that does not change user outcomes.

- `A1`: What user behavior must change after this phase?
- `A2`: What business/operational signal proves the phase worked?
- `A3`: What anti-outcomes are unacceptable?

Unlocks: scope boundaries (`B*`), verification (`G*`).

## B. Scope Boundaries

Purpose: control sprawl and hidden complexity.

- `B1`: In-scope capabilities (must deliver now).
- `B2`: Explicitly out-of-scope capabilities (defer).
- `B3`: Required integrations now vs mock/stub fallback.

Unlocks: system design (`C*`), sequencing (`D*`).

## C. System and Data Design

Purpose: force architecture decisions before implementation.

- `C1`: Source-of-truth data entities and contracts.
- `C2`: Read/write boundaries (client, server, edge function, DB).
- `C3`: Failure handling model (timeouts, retries, stale data, fallback).
- `C4`: Security/privacy controls for sensitive data and logs.

Unlocks: milestone sequencing (`D*`), risk analysis (`F*`).

## D. Milestone and Dependency Sequencing

Purpose: eliminate circular dependencies and hidden blockers.

- `D1`: Milestone order with dependency rationale.
- `D2`: Per milestone entry criteria.
- `D3`: Per milestone exit criteria.
- `D4`: Per milestone owner and required artifacts.

Unlocks: execution plan (`E*`), validation (`G*`).

## E. Execution Plan Details

Purpose: make implementation unambiguous.

- `E1`: Task list mapped to concrete file paths/areas.
- `E2`: API/data touches and migration implications.
- `E3`: Rollout strategy (flags, staged release, rollback trigger).

Unlocks: risk register (`F*`), validation matrix (`G*`).

## F. Risk and Pre-Mortem

Purpose: identify likely failure paths before coding.

- `F1`: Top technical failure modes and blast radius.
- `F2`: Top product/UX failure modes and blast radius.
- `F3`: Monitoring and alerting for early detection.
- `F4`: Mitigation and rollback per high-risk item.

Unlocks: final approval gate.

## G. Validation and Definition of Done

Purpose: ensure pass/fail proof exists before execution.

- `G1`: Test and validation commands (typecheck/lint/tests/e2e).
- `G2`: Scenario matrix (happy path + failure path).
- `G3`: Acceptance criteria in observable terms.
- `G4`: Production readiness checks.

Unlocks: go/no-go decision.

## H. Final Go/No-Go Gate

Approve only when:

- Critical decisions are resolved or have approved compensating controls.
- Milestone dependencies are acyclic and checkable.
- Validation matrix has objective pass/fail checks.
- Rollback path is defined for every risky rollout step.
