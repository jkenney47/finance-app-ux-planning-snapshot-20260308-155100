# Phase Plan (Red-Team Approved)

Date: 2026-03-06
Status: Planned
Risk: HIGH
Rationale: This phase combines tracked-state cleanup, route moves, documentation authority changes, and a Supabase edge-function test-harness refactor.

## 1. Objective and Non-Goals

- Objective:
  Complete the remaining repo-optimization work after the automation-quality slice by removing exposed/generated-state hazards, reducing doc authority drift, separating internal/operator routes from the end-user dashboard group, and replacing the brittle `agentGateway` test harness.
- Primary user outcome:
  Agents and humans can resume feature development with clearer repo boundaries, safer defaults, and fewer misleading docs/routes.
- Primary operational/business outcome:
  The repo becomes safer to operate and easier to navigate without weakening the existing quality gate, plan gate, or UI-review loop.
- Non-goals:
  - Do not reopen the completed automation-quality simplification slice.
  - Do not add new write-capable automation.
  - Do not redesign end-user dashboard UX beyond link retargeting required by the route move.
  - Do not rewrite the full `agentGateway` handler; only extract the provider-invocation path needed for stable tests.
  - Do not change the canonical local completion gate away from `npm run validate`.

## 2. Decision Ledger Summary

| Decision ID | Branch        | Decision                                                                                                                                                                                                                                           | Status   | Confidence | Dependencies Unlocked |
| ----------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | --------------------- |
| A1          | Outcome       | Treat the remaining optimization work as repo-operability work, not product-feature work.                                                                                                                                                          | resolved | high       | B1, B2, D1            |
| B1          | Scope         | Keep the remaining work limited to four buckets: secret/generated-state cleanup, docs consolidation, ops-route separation, and `agentGateway` test cleanup.                                                                                        | resolved | high       | C1, D1                |
| B2          | Scope         | Preserve `AI_RULES.md`, `DEVELOPMENT.md`, `docs/PRODUCT_PLAN.md`, `npm run validate`, plan gating, depgraph checks, and UI review as current authorities/gates.                                                                                    | resolved | high       | C2, G1                |
| C1          | State cleanup | Remove the exposed `SUPABASE_ACCESS_TOKEN` literal from docs and untrack `.agents/memory/events.ndjson` plus `.agents/memory/index.json`, while keeping `.agents/memory/rules.md`, `.agents/hooks/*`, and `.agents/plan/current-plan.txt` tracked. | resolved | high       | D1, E1                |
| C2          | Docs strategy | Keep `docs/SYSTEM_MAP.md` as a small maintained artifact and add a path-existence validator instead of generating a large prose map.                                                                                                               | resolved | high       | D1, E1                |
| C3          | Route design  | Move operator routes to `app/(ops)` and `ui-lab` to `app/(internal)`, keep temporary redirect wrappers under `app/(dashboard)` until smoke validation passes, and retarget internal links to the new groups.                                       | resolved | medium     | D1, E1                |
| C4          | Test design   | Extract pure provider-invocation logic from `supabase/functions/agentGateway/index.ts` into a shared module and test that module directly from Jest.                                                                                               | resolved | high       | D1, E1                |
| D1          | Sequencing    | Implement in dependency order: cleanup -> test harness extraction -> route separation -> docs consolidation/System Map tightening.                                                                                                                 | resolved | high       | E1, F1, G1            |
| E1          | Validation    | Use targeted repo checks (`rg`, `git ls-files`, Jest target, Maestro smoke) plus `npm run validate`; do not modify CI gates again in this packet.                                                                                                  | resolved | high       | F1, G1                |
| F1          | Rollback      | Roll back each bucket independently: cleanup, handler/test, route group move, docs consolidation. Keep old route redirect stubs until route validation is green.                                                                                   | resolved | high       | H                     |

## 3. Scope Definition

- In scope:
  - Scrub exposed credential literals from tracked docs and prevent generated memory state from remaining tracked.
  - Reduce duplicate entrypoint/orchestration docs and tighten `docs/SYSTEM_MAP.md` with objective validation.
  - Move `agent-hub` and `policy-ops` out of `app/(dashboard)` into `app/(ops)`, and move `ui-lab` into `app/(internal)`.
  - Replace the `readFileSync + new Function(...)` `agentGateway` test harness with tests against extracted pure module exports.
- Out of scope:
  - Branch-retention tooling and remote branch cleanup automation.
  - Additional CI workflow changes beyond what the automation slice already completed.
  - Broader `app/(dashboard)/index.tsx` or `journey.tsx` decomposition beyond link retargeting.
  - `.codex/config.toml` drift or model-profile changes.
- Required integrations now:
  - Expo Router route groups and redirects.
  - Jest/ts-jest for the pure module tests.
  - Existing Maestro smoke flows.
  - Existing plan and quality gates.
- Deferred integrations and fallback strategy:
  - Any secret-literal scan can remain a targeted script/check in this packet; do not re-expand CI surface unless noise stays acceptably low.
  - Remove legacy dashboard redirect wrappers only after route validation passes in a later cleanup slice if needed.

### Repo Truth Anchors

- `docs/operations/runbook.md` currently contains a literal `SUPABASE_ACCESS_TOKEN=sbp_...` example that must be treated as compromised and replaced.
- `.gitignore` already ignores `.agents/memory/events.ndjson` and `.agents/memory/index.json`, but both files are still tracked.
- `docs/SYSTEM_MAP.md` is already small enough to keep, but it has no objective path-validation guard.
- `app/(dashboard)/_layout.tsx` still declares hidden screens for `agent-hub`, `policy-ops`, and `ui-lab`.
- `app/(dashboard)/journey.tsx`, `app/(dashboard)/goals.tsx`, and `app/(dashboard)/profile.tsx` still push to `/(dashboard)` internal ops routes.
- `__tests__/supabase/functions/agentGateway.test.ts` currently reads the edge function source, strips imports, transpiles it, and executes it with `new Function(...)`.

### No-Change Decisions

- Keep `AI_RULES.md` and `DEVELOPMENT.md` as canonical top-level operator docs; this packet reduces duplicate pointers around them instead of replacing them.
- Keep `docs/SYSTEM_MAP.md` as an authority, but keep it intentionally short rather than turning it into a generated architecture dump.
- Do not alter `.github/workflows/lint.yml`, `plan-gate.yml`, or `ui-review.yml` again in this packet.
- Do not refactor the full `agentGateway` request/auth/logging flow; extract only provider invocation logic needed for stable tests.
- Do not remove the legacy dashboard route wrappers in the same slice that introduces new route groups; use redirects first.

## 4. Milestone Plan

### Milestone 1: Security and Generated-State Hygiene

- Objective:
  Remove the exposed Supabase token literal and stop tracking generated agent-memory state.
- Entry criteria:
  - Automation-quality slice changes are present in the worktree.
  - Current plan pointer can be updated to this packet before implementation.
- Exit criteria:
  - No tracked doc contains the exposed `sbp_...` token literal.
  - `.agents/memory/events.ndjson` and `.agents/memory/index.json` are no longer tracked.
  - Tracked agent operational files are limited to stable assets (`rules.md`, hooks, active plan pointer).
- Dependencies:
  - Current repo truth from `.gitignore`, `docs/operations/runbook.md`, and `git ls-files`.
- Owner:
  - Implementer.
- Artifacts:
  - Updated `docs/operations/runbook.md`.
  - Updated tracking state for `.agents/memory/*`.
  - Optional targeted secret-check script/output if added.
- Verification:
  - `git ls-files .agents/memory .agents/hooks .agents/plan`
  - `rg -n "sbp_|SUPABASE_ACCESS_TOKEN=" docs README.md .github scripts .agents`
- Rollback:
  - Restore tracked-memory files only if a required tool demonstrably breaks without them being tracked.
  - Revert the doc scrub only if a placeholder replacement accidentally removes required operational instructions.

### Milestone 2: `agentGateway` Extraction and Test Replacement

- Objective:
  Replace the brittle source-eval harness with tests against shared pure module exports.
- Entry criteria:
  - Milestone 1 complete.
  - Current `agentGateway` behavior is understood from the existing function and test.
- Exit criteria:
  - `__tests__/supabase/functions/agentGateway.test.ts` no longer reads source files or uses `new Function(...)`.
  - Shared pure invocation logic is imported by the edge handler and test.
  - Existing success/failure/mocked-provider behavior remains covered.
- Dependencies:
  - `supabase/functions/agentGateway/index.ts`
  - `__tests__/supabase/functions/agentGateway.test.ts`
- Owner:
  - Implementer.
- Artifacts:
  - New `supabase/functions/agentGateway/providerInvocation.ts` (or equivalent pure helper module).
  - Updated `supabase/functions/agentGateway/index.ts`.
  - Updated Jest test(s).
- Verification:
  - `npm test -- __tests__/supabase/functions/agentGateway.test.ts`
  - `node --check supabase/functions/agentGateway/index.ts` is not valid in Deno syntax, so rely on Jest/import behavior plus full `npm run validate`.
- Rollback:
  - Revert the extracted module and test together if behavior diverges from the handler contract.

### Milestone 3: Internal Ops Route Separation

- Objective:
  Move internal/operator surfaces out of `app/(dashboard)` while keeping temporary compatibility redirects.
- Entry criteria:
  - Milestone 2 complete.
  - Route callers and smoke-flow dependencies are inventoried.
- Exit criteria:
  - `agent-hub` and `policy-ops` live under `app/(ops)`.
  - `ui-lab` lives under `app/(internal)`.
  - `app/(dashboard)` versions become redirect wrappers.
  - Internal links target the new route groups.
  - Ops screens are no longer treated as true dashboard-owned implementations.
- Dependencies:
  - `app/(dashboard)/_layout.tsx`
  - `app/(dashboard)/journey.tsx`
  - `app/(dashboard)/goals.tsx`
  - `app/(dashboard)/profile.tsx`
  - Maestro smoke flows and route-dependent docs.
- Owner:
  - Implementer.
- Artifacts:
  - New `app/(ops)/_layout.tsx`, `app/(ops)/agent-hub.tsx`, `app/(ops)/policy-ops.tsx`
  - New `app/(internal)/_layout.tsx`, `app/(internal)/ui-lab.tsx`
  - Redirect wrappers in `app/(dashboard)/agent-hub.tsx`, `app/(dashboard)/policy-ops.tsx`, `app/(dashboard)/ui-lab.tsx`
  - Updated deep-link callers and route docs
- Verification:
  - `npm run e2e -- ops-surfaces-smoke`
  - `npm run e2e -- policy-stale`
  - `npm run e2e -- policy-stale-rates`
  - Full `npm run validate`
- Rollback:
  - Revert the new route-group files and redirect wrappers together.
  - Keep old dashboard implementations if redirect-based migration creates navigation regressions.

### Milestone 4: Documentation Authority Cleanup and System Map Tightening

- Objective:
  Reduce duplicate entrypoint/orchestration docs and make the small system map objectively trustworthy.
- Entry criteria:
  - Route paths are settled from Milestone 3.
  - Canonical doc hierarchy remains unchanged.
- Exit criteria:
  - `docs/README.md` remains the canonical doc index.
  - `START_HERE.md` and `CODEX.md` are reduced to short role-specific pointers, not overlapping workflow manuals.
  - `docs/operations/agent-orchestration.md` remains the canonical orchestration runbook, with `docs/operations/codex-multi-agent.md` focused on role workflow specifics.
  - `docs/SYSTEM_MAP.md` matches current route groups and has a path-existence validator.
- Dependencies:
  - Updated route groups from Milestone 3.
  - Existing canonical hierarchy in `AI_RULES.md`, `DEVELOPMENT.md`, `docs/README.md`.
- Owner:
  - Implementer.
- Artifacts:
  - Updated `docs/README.md`, `START_HERE.md`, `CODEX.md`, `docs/SYSTEM_MAP.md`, `DEVELOPMENT.md`, `docs/operations/agent-orchestration.md`, `docs/operations/codex-multi-agent.md`
  - New `scripts/validate-system-map.mjs`
- Verification:
  - `node scripts/validate-system-map.mjs`
  - `rg -n "docs/SYSTEM_MAP.md|CODEX.md|START_HERE.md|agent-orchestration|codex-multi-agent" AI_RULES.md DEVELOPMENT.md docs README.md START_HERE.md CODEX.md AGENTS.md`
  - Full `npm run validate`
- Rollback:
  - Revert the docs batch together if hierarchy becomes less clear or links break.
  - Keep the validator script even if wording changes need to roll back.

## 5. Execution Task Map

| Task                                       | Target Area (paths)                                                                                                                               | Inputs/Dependencies                        | API/Data Touches                                      | Output/Artifacts                                                     | Verification                                                    | Effort                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | --- |
| Scrub exposed Supabase token literal       | `docs/operations/runbook.md`                                                                                                                      | existing runbook commands and auth notes   | none                                                  | placeholder-only credential instructions                             | `rg -n "sbp\_                                                   | SUPABASE_ACCESS_TOKEN=" docs README.md .github scripts .agents` | S   |
| Stop tracking generated agent-memory state | `.agents/memory/events.ndjson`, `.agents/memory/index.json`, `.gitignore`                                                                         | tracked-file inventory from `git ls-files` | repo index only                                       | generated memory files ignored but untracked                         | `git ls-files .agents/memory .agents/hooks .agents/plan`        | S                                                               |
| Preserve tracked operational agent assets  | `.agents/memory/rules.md`, `.agents/hooks/*`, `.agents/plan/current-plan.txt`                                                                     | current tracked asset list                 | none                                                  | explicit tracked/untracked split                                     | `git ls-files .agents/memory .agents/hooks .agents/plan`        | S                                                               |
| Extract pure provider invocation module    | `supabase/functions/agentGateway/index.ts`, `supabase/functions/agentGateway/providerInvocation.ts`                                               | current handler behavior                   | provider request payloads only; no DB contract change | pure importable module used by handler and tests                     | `npm test -- __tests__/supabase/functions/agentGateway.test.ts` | M                                                               |
| Replace source-eval Jest harness           | `__tests__/supabase/functions/agentGateway.test.ts`                                                                                               | extracted pure module                      | none                                                  | stable Jest tests without `readFileSync` / `new Function`            | `npm test -- __tests__/supabase/functions/agentGateway.test.ts` | M                                                               |
| Create ops/internal route groups           | `app/(ops)/_layout.tsx`, `app/(ops)/agent-hub.tsx`, `app/(ops)/policy-ops.tsx`, `app/(internal)/_layout.tsx`, `app/(internal)/ui-lab.tsx`         | existing dashboard implementations         | navigation only                                       | new route homes outside dashboard                                    | smoke flows + local navigation                                  | M                                                               |
| Add dashboard compatibility redirects      | `app/(dashboard)/agent-hub.tsx`, `app/(dashboard)/policy-ops.tsx`, `app/(dashboard)/ui-lab.tsx`                                                   | new route groups                           | navigation only                                       | temporary wrappers to preserve old links during migration            | smoke flows                                                     | S                                                               |
| Retarget internal deep links               | `app/(dashboard)/journey.tsx`, `app/(dashboard)/goals.tsx`, `app/(dashboard)/profile.tsx`                                                         | new route groups                           | navigation only                                       | new route targets                                                    | smoke flows                                                     | S                                                               |
| Update dashboard layout ownership notes    | `app/(dashboard)/_layout.tsx`                                                                                                                     | redirect-wrapper approach                  | navigation only                                       | hidden routes kept only as compatibility screens until later cleanup | route review + smoke flows                                      | S                                                               |
| Update route-dependent docs                | `docs/operations/runbook.md`, `docs/PRODUCT_PLAN.md`                                                                                              | final route group paths                    | none                                                  | docs no longer claim ops surfaces live under `/(dashboard)`          | docs grep + manual review                                       | S                                                               |
| Consolidate doc entrypoints                | `docs/README.md`, `START_HERE.md`, `CODEX.md`, `DEVELOPMENT.md`, `docs/operations/agent-orchestration.md`, `docs/operations/codex-multi-agent.md` | canonical hierarchy                        | none                                                  | shorter, non-overlapping entry docs                                  | link grep + manual review                                       | M                                                               |
| Tighten System Map with validator          | `docs/SYSTEM_MAP.md`, `scripts/validate-system-map.mjs`                                                                                           | actual route groups and file paths         | filesystem reads only                                 | trustworthy small map + objective existence check                    | `node scripts/validate-system-map.mjs`                          | M                                                               |

## 6. Risk Register

| Risk                                                       | Type             | Impact | Likelihood | Mitigation                                                                                                       | Detection                                            | Rollback Trigger                                                               |
| ---------------------------------------------------------- | ---------------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Exposed token literal remains in tracked docs or artifacts | security/privacy | high   | medium     | scrub literal immediately and replace with placeholders before broader refactors                                 | repo-wide `rg` for `sbp_`/token examples             | any tracked file still contains a live-looking PAT literal                     |
| Untracking memory files breaks autopilot assumptions       | operational      | medium | medium     | keep `.agents/memory/rules.md`, hooks, and current plan pointer tracked; validate command paths after untracking | `git ls-files` inventory and autopilot command smoke | autopilot script fails because it requires tracked generated memory files      |
| Route-group move breaks navigation or hides ops screens    | technical/UX     | high   | medium     | use redirect wrappers first; retarget callers before removing compatibility                                      | Maestro ops/policy smoke flows, manual route review  | any smoke flow fails or route push hits missing screen                         |
| `ui-lab` becomes inaccessible to intended QA flows         | product/UX       | medium | medium     | keep explicit internal route and gate entry from profile instead of deleting access                              | manual route review + smoke flow if applicable       | profile/QA path can no longer reach `ui-lab`                                   |
| Extracted `agentGateway` module changes behavior           | technical        | high   | low        | extract only pure helpers and preserve current test scenarios                                                    | targeted Jest suite + full validate                  | handler or tests diverge from current invocation contract                      |
| Docs consolidation creates new source-of-truth ambiguity   | delivery/process | medium | medium     | keep `AI_RULES.md`, `DEVELOPMENT.md`, and `docs/README.md` authoritative; reduce only duplicates                 | link/grep sweep across entrypoint docs               | multiple docs again claim the same authority role                              |
| System map validator becomes stale or too strict           | operational      | low    | medium     | validate only path existence and key canonical targets, not subjective architecture claims                       | `node scripts/validate-system-map.mjs`               | routine valid changes fail because validator encodes non-essential assumptions |

## 7. Validation Matrix

| Check                               | Command or Method                                                             | Pass/Fail Rule                                                                                                       | Artifact                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------- |
| Secret scrub                        | `rg -n "sbp\_                                                                 | SUPABASE_ACCESS_TOKEN=" docs README.md .github scripts .agents`                                                      | Pass if no tracked file contains a live token literal; placeholders only | command output |
| Tracked generated-state split       | `git ls-files .agents/memory .agents/hooks .agents/plan`                      | Pass if `events.ndjson` and `index.json` are absent while `rules.md`, hooks, and current plan pointer remain tracked | command output                                                           |
| `agentGateway` harness replacement  | `npm test -- __tests__/supabase/functions/agentGateway.test.ts`               | Pass if suite exercises provider invocation without source-eval hacks                                                | Jest output                                                              |
| System map trust                    | `node scripts/validate-system-map.mjs`                                        | Pass if all referenced canonical paths exist                                                                         | command output                                                           |
| Ops-route regression                | `npm run e2e -- ops-surfaces-smoke`                                           | Pass if agent hub and policy ops flows still render expected test IDs                                                | Maestro artifact/log                                                     |
| Policy stale flows after route move | `npm run e2e -- policy-stale` and `npm run e2e -- policy-stale-rates`         | Pass if stale-policy CTA still reaches policy ops surface                                                            | Maestro artifact/log                                                     |
| Final repo gate                     | `npm run validate`                                                            | Pass if env, typecheck, lint, format, Maestro flow validation, depgraph, coverage, and memory checkpoint all succeed | command output                                                           |
| Instruction drift after doc cleanup | `npm run check:instruction-drift`                                             | Pass if no legacy instruction drift is detected                                                                      | command output                                                           |
| Commit checkpoint                   | `git status --short`, `git diff --name-only`, `git diff --cached --name-only` | Pass if implementer can classify the diff as `Commit now`, `Split before commit`, or `Wait` with rationale           | command output + checkpoint decision                                     |

## 8. Open Items

- Open critical items (if any):
  - None. This packet is implementation-ready under autonomous defaults.
- Assigned owner:
  - Implementer for execution; reviewer for final regression pass.
- Resolution condition:
  - Temporary dashboard redirect wrappers can remain until route validation is green and a later cleanup removes them explicitly.
- Blocking status:
  - Not blocked.

## 9. Go/No-Go Decision

- Decision:
  - GO
- Rationale:
  - The remaining work has clear repo-truth anchors, bounded scope, objective validation, and rollback paths per risk bucket. No critical decision remains open.
- First implementation slice:
  - Milestone 1 (`docs/operations/runbook.md` scrub + untrack `.agents/memory/events.ndjson` and `.agents/memory/index.json`) followed immediately by Milestone 2 (`agentGateway` pure-module extraction and test replacement).

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-06T10:51:29Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260306-055129-2026-03-06-remaining-repo-optimization-execution-packet.md
Gemini-Review-Model: gemini-3.1-pro-preview

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-06T10:53:25Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260306-055325-2026-03-06-remaining-repo-optimization-execution-packet-codex-approval.md
Codex-Approval-By: Codex
