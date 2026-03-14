# Quality Gates

This repo enforces hard quality gates locally and in CI.

## Required Local Gate

Run:

```bash
npm run validate
```

`validate` runs:

1. `npm run validate:env`
2. `npm run validate:tracked-secrets`
3. `npm run validate:system-map`
4. `npm run validate:case-collisions`
5. `npm run schema:check`
6. `npm run typecheck`
7. `npm run lint`
8. `npm run format:check`
9. `npm run validate:maestro-flows`
10. `npm run depgraph:check`
11. `npm run test:coverage`
12. `npm run memory:checkpoint`

Surface coverage notes:

- `typecheck` aggregates `typecheck:app`, `typecheck:supabase`, and `typecheck:scripts`.
- `lint` aggregates `lint:app`, `lint:supabase`, and `lint:scripts`.
- `depgraph:check` aggregates `depgraph:check:app` and `depgraph:check:backend`.
- Schema snapshot regeneration command: `npm run schema:generate`.

## CI Gate Matrix

PR CI is intentionally split into a few explicit gates:

1. `Quality Checks` in `.github/workflows/lint.yml`
   - runs `npm run validate`
   - then runs `npm run check:instruction-drift`
   - runs for all PR/push changes on `main`, including docs/policy-only updates
2. `Plan Gate` in `.github/workflows/plan-gate.yml`
   - enforces active-plan metadata for implementation-path changes

This keeps one canonical validation command for local completion while preserving a separate CI gate for plan enforcement.

Local UI review remains available as a manual artifact workflow:

- `npm run ui:review`
- outputs `artifacts/ui-review/<timestamp>/`

## Automation Safety Default

- Unattended automation should validate and report by default.
- Write-capable automation should default to manual triggers and report-only execution unless an operator explicitly enables mutation behavior (for example, a manual `workflow_dispatch` input).
- Repo-writing remediation must be explicitly triggered; scheduled/background workflows must not auto-merge or auto-create remediation PRs.

## Required Plan Gate (Local + CI)

Implementation-path changes are blocked unless an active plan has both:

- Review metadata + tracked artifact
- Codex final approval metadata + tracked artifact
- For `MED/HIGH` risk work, required role workflow (`planner -> implementer -> reviewer -> orchestrator merge`) completed per `docs/operations/codex-multi-agent.md`

Local pre-commit hooks run:

1. `npm run plan:auto-review`
2. `npm run plan:guard`
3. `npm run plan:implementation:guard`

Plan mode trigger:

- In Codex Plan mode (`CODEX_COLLABORATION_MODE=plan`, `COLLABORATION_MODE=plan`, `CODEX_MODE=plan`, or `CODEX_PLAN_MODE=1`), the implementation gate also enforces active-plan validity even when implementation paths are unchanged.

Set/finalize the active plan before implementation:

```bash
npm run plan:finalize -- docs/PRODUCT_PLAN.md "Codex approval summary"
```

CI also enforces this gate in:

- `.github/workflows/plan-gate.yml`

## Milestone 6 Phase A rollout gate

Before enabling live-data flags in shared environments:

- `npm run validate` must pass on the candidate commit.
- `.env/.env.local` rollout flags must be strict booleans (`true` or `false`).
- Reject incompatible live-rollout combinations during env validation (for example live account data enabled while mock mode remains on).
- Keep rollback flags documented and ready (`EXPO_PUBLIC_USE_MOCK_DATA=true`, other rollout flags `false`).
  Phase progression requirements:

| Phase                 | Required evidence                                                                                                 | Required sign-off                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| A1 mock-only baseline | `npm run validate` pass + mock critical-loop smoke                                                                | Engineering owner                 |
| A2 sandbox-link trial | A1 evidence + successful sandbox token + exchange with captured `request_id` values                               | Engineering owner + QA/operator   |
| A3 real-summary trial | A2 evidence + linked-account summary fetch + fallback verification (`EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false`) | Product owner + engineering owner |

A phase is not complete until evidence is captured and the listed owners approve promotion.
Use `docs/operations/milestone-6-phase-a-evidence-log.md` as the release artifact for this gate.
Use `npm run rollout:phase-a -- --phase ALL` to collect A2/A3 request-id evidence and write timestamped artifacts under `artifacts/rollout-phase-a/`.

## Milestone 6 ingestion reliability gate

Before promoting live-data rollout beyond shared QA:

- Run `npm run rollout:ingestion -- --window-hours 24 --probe-webhook` when `PLAID_VERIFICATION_CODE` is available.
- If webhook probe secret is unavailable, run `npm run rollout:ingestion -- --window-hours 24` and preserve the skip reason from the artifact.
- Attach `ingestion-check.json` and `ingestion-check.md` from `artifacts/rollout-ingestion/<timestamp>/`.
- Review warning output and record owner + remediation for each warning before promotion.

Gate expectation:

| Check                       | Required evidence                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Webhook intake/queue health | `raw_transactions`, `pending_insights`, and `transactions` recent counts are captured in ingestion artifacts |
| Active webhook probe        | `plaidWebhook` probe status is `ok` with request-id, or explicit skip reason is recorded                     |
| Downstream consumer probe   | `getNetWorthSlice` probe result with `request_id` (or explicit skip reason) is captured                      |

## Test Coverage Thresholds

Coverage thresholds are enforced in `jest.config.js`:

- Statements: `80%`
- Branches: `70%`
- Functions: `80%`
- Lines: `80%`

## Dependency Graph Gate

Use:

```bash
npm run depgraph:check
```

This fails when circular dependencies are detected in:

- `app/`
- `components/`
- `hooks/`
- `stores/`
- `theme/`
- `utils/`

Generate dependency graph artifacts with:

```bash
npm run depgraph:build
```

Artifacts are written to `artifacts/dependency-graph/latest/`.

## Deterministic Agent Sandbox

Use:

```bash
npm run test:agent-sandbox
```

This command forces mock-only flags and runs deterministic validation/test flows without requiring live Plaid or production data.
