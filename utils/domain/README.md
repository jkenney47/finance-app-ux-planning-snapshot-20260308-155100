# Domain Logic (`utils/domain`)

This folder contains deterministic business logic that must remain side-effect free.

## Invariants

- Domain modules should not perform network requests.
- Inputs and outputs must stay fully typed and serializable.
- Core decisions should be reproducible from the same inputs.

## Current Modules

- `fme/engine.ts`: Financial Milestone Engine recommendation computation.
- `fme/factsDerivation.ts`: Fact shaping and derivation helpers.
- `fme/logging.ts`: Deterministic evaluation log payload/signature builders.
- `fme/policies.ts`: Policy-domain normalization helpers.
- `decisionEngine.ts`: legacy compatibility shim; do not add new product logic here.

## Source of Truth

- Canonical recommendation engine path: `fme/engine.ts`.
- `decisionEngine.ts` remains secondary until legacy references are retired.

## Change Guidance

- Prefer adding tests under `__tests__/utils/` for any behavior changes.
- Keep hash/signature functions stable unless a migration plan is explicit.
