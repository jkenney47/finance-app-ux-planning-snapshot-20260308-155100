# Migration Plan

## Strategy

- Primary strategy: Strangler / compatibility shim / staged refactor / other
- Why this strategy fits:

## Stage 0 - Safety Net

- Characterization tests:
- Observability and alerting:
- Rollback trigger:
- Exit gate:

## Stage 1 - Introduce New Path

- Scope:
- Compatibility approach:
- Exit criteria:
- Validation checks:
- Rollback lever:

## Stage 2 - Migrate Reads/Writes

- Read path migration:
- Write path migration:
- Data consistency checks:
- Exit criteria:
- Rollback lever:

## Stage 3 - Backfill and Verify

- Backfill method:
- Verification queries/tests:
- Rollback criteria:
- Exit criteria:

## Stage 4 - Cutover

- Cutover plan:
- Success criteria (SLO guardrails):
- Rollback plan:

## Stage 5 - Remove Legacy

- Removal scope:
- Debt cleanup:
- Final validation:

## Rollout Scorecard

| Stage | Success Metric | Abort Threshold | Decision Owner |
| ----- | -------------- | --------------- | -------------- |
| 0     | ...            | ...             | ...            |
| 1     | ...            | ...             | ...            |
| 2     | ...            | ...             | ...            |
| 3     | ...            | ...             | ...            |
| 4     | ...            | ...             | ...            |
| 5     | ...            | ...             | ...            |
