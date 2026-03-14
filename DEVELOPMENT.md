# Development Guide

This is the operator guide for day-to-day engineering work in this repo.

## Project Orientation

- Stack summary: `README.md`
- Canonical constraints: `AI_RULES.md`
- Task-to-file routing: `docs/SYSTEM_MAP.md`

## Standard Commands

```bash
npm run bootstrap
npm run plan:finalize -- docs/PRODUCT_PLAN.md "Codex approval summary"
npm run start
npm run ios
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run depgraph:check
npm run agent:ops:report
npm run validate
npm run security:audit:summary
npm run schema:generate
npm run schema:check
npm run e2e
npm run ui:review
npm run test:agent-sandbox
```

`bootstrap` verifies Node `20.x` and installs dependencies from the committed lockfile.

## Codex Multi-Agent (MED/HIGH Required)

- Orchestration policy: `docs/operations/agent-orchestration.md`
- Codex role-workflow detail: `docs/operations/codex-multi-agent.md`
- Readiness scorecard: `docs/operations/agent-only-readiness.md`
- Risk tiering source for roadmap items: `docs/PRODUCT_PLAN.md`

## Required Validation Workflow

Follow `AI_RULES.md` section 5 before reporting completion (`npm run validate`).

Implementation-path commits are also plan-gated via pre-commit:

- `npm run plan:auto-review`
- `npm run lint:design-tokens` (staged-line token guard; use `// design-token-lint: allow` for explicit one-off exceptions)
- `npm run plan:guard`
- `npm run plan:implementation:guard`

`validate` runs environment checks, typechecking, linting, format checks, Maestro flow validation, dependency cycle checks, coverage-gated tests, and a memory checkpoint.

Run `npm run security:audit:summary` after dependency changes or before shipping workflow/tooling updates that should keep the repo at `0 critical` and `0 high` vulnerabilities.

If you intentionally change dependencies, refresh and commit `package-lock.json` before expecting `npm run bootstrap` to pass.

Manual branch hygiene is available via:

- `npm run branch:retention:report`
- `npm run branch:retention:apply`

## E2E (Maestro)

- Install Maestro CLI (macOS): `brew install maestro`
- Ensure a Java runtime is available for Maestro CLI.
- Use mock-first flags for all flows:
  - `EXPO_PUBLIC_BYPASS_AUTH=true`
  - `EXPO_PUBLIC_USE_MOCK_DATA=true`
  - `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=false`
  - `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false`
- Flow/scenario matrix:
  - `npm run e2e -- critical-loop` → `EXPO_PUBLIC_MOCK_SCENARIO=default`
  - `npm run e2e -- dashboard-tab-states` → `EXPO_PUBLIC_MOCK_SCENARIO=default`
  - `npm run e2e -- empty-state` → `EXPO_PUBLIC_MOCK_SCENARIO=empty`
  - `npm run e2e -- partial-facts` → `EXPO_PUBLIC_MOCK_SCENARIO=partial_facts`
  - `npm run e2e -- linked-no-transactions` → `EXPO_PUBLIC_MOCK_SCENARIO=linked_no_transactions`
  - `npm run e2e -- policy-stale` → `EXPO_PUBLIC_MOCK_SCENARIO=policy_stale_thresholds`
  - `npm run e2e -- policy-stale-rates` → `EXPO_PUBLIC_MOCK_SCENARIO=policy_stale_rates`
  - `npm run e2e -- crisis-cash-flow` → `EXPO_PUBLIC_MOCK_SCENARIO=crisis_cash_flow`
  - `npm run e2e -- ops-surfaces-smoke` → `EXPO_PUBLIC_MOCK_SCENARIO=default`
- Live Plaid sandbox linking only activates when both `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true` and `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true`.
- `scripts/e2e.sh` validates all mock-only flags and `EXPO_PUBLIC_MOCK_SCENARIO` against the selected flow when those variables are set in the shell.

`e2e` is a separate release/smoke workflow and is intentionally not part of `npm run validate`.

## UX Loop Runner

- Run one flow and generate artifacts: `npm run ux:loop -- critical-loop`
- Run all flow smoke checks: `npm run ux:loop:all`
- List supported flows: `npm run ux:loop -- --list`
- Artifacts are written to `artifacts/ux-loop/<timestamp>/` with per-flow logs plus `report.md` and `summary.json`.
- If Maestro is missing or cannot start (for example, Java runtime not configured), flows are marked `skipped` and the command exits successfully after writing artifacts.

## Automated UI Review (Local Artifact Tool)

Use this when design work needs a manual screenshot/artifact packet after the main quality gate:

1. Finalize the active plan:

```bash
npm run plan:finalize -- docs/PRODUCT_PLAN.md "Codex approval summary"
```

2. Run required quality gate:

```bash
npm run validate
```

3. Run automated UI review packet generation:

```bash
npm run ui:review
```

`ui:review` generates:

- `artifacts/ui-review/<timestamp>/report.md`
- `artifacts/ui-review/<timestamp>/summary.json`
- `artifacts/ui-review/<timestamp>/screenshots/`

Default behavior:

- runs Maestro UI flows across device/appearance/text-size matrix
- captures simulator screenshots for each flow/scenario

Useful toggles:

- Skip validate inside runner: `UI_REVIEW_RUN_VALIDATE=false npm run ui:review`
- Skip UX loop inside runner: `UI_REVIEW_RUN_UX_LOOP=false npm run ui:review`
- Restrict flows: `UI_REVIEW_FLOWS="critical-loop ops-surfaces-smoke" npm run ui:review`

This is a local/manual review tool. It is not part of the current GitHub Actions PR gate set.

## Environment Setup

1. Create `.env.local` (preferred) or `.env`.
2. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. If you copy `env.example`, replace every `YOUR_...` placeholder you keep, or remove those lines.
4. Run `npm run validate:env` to catch placeholder/missing values.

## Docs

- Docs index: `docs/README.md`
- Active design doc: `docs/architecture/ai-financial-advisor-design-doc.md`
- API reference: `docs/reference/endpoints.md`
