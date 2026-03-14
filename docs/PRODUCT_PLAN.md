# Product Development Plan

Last updated: 2026-03-08
Owner: Product + Engineering
Status: Post-MVP Reliability Milestone In Progress

## How to use this doc

This is the single source of truth for what we are building, in what order, and what "done" means.

Document role:

- This doc is the canonical live execution plan for active scope, sequencing, status, and acceptance criteria.
- Companion product/design context lives in `docs/architecture/ai-financial-advisor-design-doc.md`.
- If day-to-day implementation status or milestone order conflicts with the design doc, this file wins for execution decisions.
- If product vision, core UX principles, or major experience direction changes, update the design doc in the same slice and then reflect the resulting scope changes here.

Status tags:

- `DONE`: shipped and validated
- `IN_PROGRESS`: currently being built
- `NEXT`: queued immediately after current milestone
- `LATER`: intentionally deferred
- `STUBBED`: partial implementation with placeholders
- `MOCKED`: simulated data/integration path

Risk tags (required for new work items):

- `LOW`: docs-only or tightly scoped non-guarded updates
- `MED`: common feature/state/UI updates with moderate regression risk
- `HIGH`: auth, migrations, core user flows, rollout flags, or cross-surface refactors

Update protocol:

- Update this file at each milestone completion.
- Keep milestone scope concrete and testable.
- Mark deferred items explicitly as `LATER`.
- Keep current-state entries aligned with repository reality.
- For every new milestone/task entry, include `Risk: LOW|MED|HIGH` plus one-line rationale.
- If risk is not specified, default it to `MED` and run required multi-agent workflow for `MED/HIGH`.
- When roadmap priority, milestone status, acceptance criteria, or implementation reality changes, update this file.
- When product vision, UX principles, information architecture, or primary surface ownership changes, update the companion design doc in the same slice.

## UI Workflow (Simulator/Xcode + Maestro)

- iOS Simulator/Xcode is required for all UI changes: validate real behavior + accessibility before calling UI work done.
- Canonical workflow: `docs/ux/ui-development-workflow.md`

## Executive summary

- Product: iOS-first AI Financial Advisor focused on deterministic next-best-step guidance.
- Primary user: consumer user who needs clear financial direction without technical jargon.
- MVP intent: deliver a reliable manual/mock-first experience that provides trustworthy guidance before expanding integrations.
- Success signal: user can complete auth, onboarding, and receive a clear recommendation with transparent reasoning and milestone progress.
- Post-MVP UI refinement now includes explainable step measurement disclosures, recommendation confidence rationale, expanded Ask-context anchoring, and roadmap/home fallback alternatives that preserve transparent tradeoff comparisons when data coverage is partial.

## Current state snapshot

### Product surfaces

| Area                        | Status        | Notes                                                                                                                                                                                          | Source                                                                                                                 |
| --------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Auth screens                | `DONE`        | Welcome, sign in, sign up, forgot password implemented                                                                                                                                         | `app/(unauth)/welcome.tsx`, `app/(unauth)/sign-in.tsx`, `app/(unauth)/sign-up.tsx`, `app/(unauth)/forgot-password.tsx` |
| Auth gate + routing         | `DONE`        | Session-based routing with optional auth bypass flag                                                                                                                                           | `app/_layout.tsx`                                                                                                      |
| Dashboard tabs              | `IN_PROGRESS` | Home, Roadmap, and Profile remain primary tabs; standalone Insights is now hidden from primary navigation while roadmap-first surfaces are aligned to the new onboarding model                 | `app/(dashboard)/_layout.tsx`                                                                                          |
| Onboarding flow             | `IN_PROGRESS` | Spec-driven multi-route onboarding with persistence, route guards, required core linking, and roadmap reveal is implemented; downstream Home/Roadmap surfaces still need full payload adoption | `app/onboarding/[...slug].tsx`, `stores/useOnboardingStore.ts`                                                         |
| Primary recommendation card | `DONE`        | Recommendation shown with actions and alternatives                                                                                                                                             | `components/dashboard/NextStepCard.tsx`                                                                                |
| Journey roadmap UI          | `DONE`        | Milestone statuses and policy health shown                                                                                                                                                     | `app/(dashboard)/journey.tsx`                                                                                          |

### Core intelligence and policy

| Area                          | Status        | Notes                                                                                                                                                                   | Source                                                                          |
| ----------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| FME engine                    | `IN_PROGRESS` | Legacy deterministic FME remains in dashboard surfaces while the new coverage-aware onboarding roadmap engine is implemented in parallel for the onboarding reveal flow | `utils/domain/fme/engine.ts`, `utils/engine/roadmap/roadmapGenerationEngine.ts` |
| Fact and evaluation contracts | `DONE`        | Typed facts, recommendations, milestones, traces                                                                                                                        | `utils/contracts/facts.ts`, `utils/contracts/fme.ts`                            |
| Policy bundle loader          | `DONE`        | Defaults + optional remote approved packs                                                                                                                               | `utils/queries/usePolicyBundle.ts`                                              |
| Rule pack loader              | `DONE`        | Optional remote rule-pack query                                                                                                                                         | `utils/queries/useRulePack.ts`                                                  |
| Policy governance UI          | `DONE`        | Operator health panel, mutation workflow telemetry, and admin controls are implemented                                                                                  | `app/(ops)/policy-ops.tsx`                                                      |

### Data and integrations

| Area                        | Status | Notes                                                                                                                                                                            | Source                                                                                                                                      |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard summary data      | `DONE` | Real summary path remains gated behind `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA`; T8 starts by keeping that gate separate from Phase A2 sandbox linking                             | `utils/dashboard.ts`                                                                                                                        |
| Account linking screen      | `DONE` | Sandbox-capable and mock linking paths are implemented behind rollout flags; T8 starts by restoring Phase A2 sandbox-link behavior without forcing the broader real-summary flag | `app/(auth)/plaid-link.tsx`                                                                                                                 |
| Plaid utility layer         | `DONE` | Edge-function helper methods are implemented; T8 starts by splitting sandbox-link and real-summary gating to match the rollout sequence                                          | `utils/account.ts`                                                                                                                          |
| Plaid edge functions        | `DONE` | `plaidLinkToken`, `plaidExchangeToken`, and `plaidAccounts` include auth checks and request-id observability                                                                     | `supabase/functions/plaidLinkToken/index.ts`, `supabase/functions/plaidExchangeToken/index.ts`, `supabase/functions/plaidAccounts/index.ts` |
| Plaid webhook function      | `DONE` | Migration-backed ingestion tables and queue writes are now aligned                                                                                                               | `supabase/functions/plaidWebhook/index.ts`, `supabase/migrations/20260218113000_add_ingestion_support_tables.sql`                           |
| Net worth slice function    | `DONE` | RPC dependency added and edge function contract aligned                                                                                                                          | `supabase/functions/getNetWorthSlice/index.ts`, `supabase/migrations/20260218113000_add_ingestion_support_tables.sql`                       |
| Goals screen data           | `DONE` | Screen uses persisted `user_goals` records with create/update flows                                                                                                              | `app/(dashboard)/goals.tsx`, `utils/queries/useGoals.ts`, `supabase/migrations/20260218162000_create_user_goals.sql`                        |
| Insights screen data        | `DONE` | Screen uses persisted insights plus deterministic summary-derived seeding pipeline                                                                                               | `app/(dashboard)/insights.tsx`, `utils/queries/useInsights.ts`, `utils/insights.ts`                                                         |
| Chat explain endpoint usage | `DONE` | `/chat-explain` edge function now validates prompts and returns education-mode explanation payloads                                                                              | `utils/chat.ts`, `supabase/functions/chat-explain/index.ts`                                                                                 |

### Logging and operations

| Area                      | Status | Notes                                                                                                                                 | Source                                                                                                                                                                                |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FME evaluation logs       | `DONE` | Edge function + fallback insert + signature support                                                                                   | `utils/queries/useFmeEvaluationLogs.ts`, `supabase/functions/logFmeEvaluation/index.ts`                                                                                               |
| Agent interop             | `DONE` | Provider model/orchestration is implemented with authenticated non-dry-run mock-provider execution plus gateway auth + CORS hardening | `app/(ops)/agent-hub.tsx`, `supabase/functions/agentGateway/index.ts`                                                                                                                 |
| Policy ops audits/admins  | `DONE` | Audit/admin tables and governance function available                                                                                  | `supabase/migrations/20260217213000_create_policy_ops_audits.sql`, `supabase/migrations/20260217222000_create_policy_ops_admins.sql`, `supabase/functions/governPolicyPacks/index.ts` |
| Release runbook/checklist | `DONE` | MVP operational runbook and release checklist added                                                                                   | `docs/operations/runbook.md`, `docs/release/mvp-release-checklist.md`                                                                                                                 |

## MVP scope (must / should / could / won't)

### Must

- Complete flow: auth -> onboarding -> dashboard recommendation -> journey milestones.
- Deterministic recommendation output with transparent rationale fields (pros, cons, assumptions, trace refs).
- Reliable local persistence for onboarding completion and fact overrides.
- Compliance-safe education posture by default.
- Plan documentation kept current in this file.

### Should

- Mock and manual fallbacks preserved for demos and operational resilience.
- Graceful empty/loading/error handling on each major screen.
- FME logs recorded for authenticated sessions.

### Could

- Real Plaid account linking and synchronization.
- Goals CRUD backed by database.
- Insights generated from real user data.

### Won't (for MVP)

- Buy/sell/ticker recommendation flows.
- Full production-grade async ingestion architecture.
- Android parity and multi-region rollout.

## User stories (MVP)

- [Must] As a user, I want to sign in and continue my plan, so that I can pick up where I left off.
- [Must] As a user, I want onboarding to ask only high-value questions, so that setup is fast.
- [Must] As a user, I want one clear next action, so that I can make progress immediately.
- [Must] As a user, I want to see why an action is recommended, so that I trust the guidance.
- [Must] As a user, I want milestone status on my journey, so that progress feels concrete.
- [Should] As a user, I want account linking to enrich recommendations, so that guidance is more personalized.
- [Could] As a user, I want goals and insights tied to my data, so that I can optimize beyond the next step.

## Functional requirements

### Feature area: Auth and session routing

- FR-1: Unauthenticated users land in `/(unauth)` routes unless bypass mode is enabled.
- FR-2: Authenticated users are routed to dashboard routes.
- FR-3: Forgot-password flow sends reset and returns user to sign-in.

### Feature area: Onboarding and fact capture

- FR-4: Onboarding surfaces the top-priority fact request from current evaluation.
- FR-5: Onboarding saves supported fact input types with validation.
- FR-6: User may finish onboarding with partial facts.

### Feature area: Recommendation and journey

- FR-7: Dashboard renders primary recommendation and alternatives when available.
- FR-8: Journey renders all milestone statuses with consistent labels.
- FR-9: Policy-stale conditions are visible and do not crash the app.

### Feature area: Explainability and logging

- FR-10: Recommendation rationale fields are accessible in UI.
- FR-11: Evaluation logs persist for authenticated users with dedupe behavior.

### Feature area: Integrations and data loading

- FR-12: App can run in mock mode without external integrations.
- FR-13: Real-data mode can be enabled behind feature flags once integrations are implemented.

## Non-functional requirements

- Security: no service-role keys in client; secrets only in edge function environment.
- Privacy: minimize persistent sensitive payload storage and avoid logging PII-rich objects.
- Performance: dashboard and journey remain responsive for typical account volumes.
- Reliability: fallback defaults prevent hard failure when remote policy/rule fetches fail.
- Availability: mock/manual path remains available during integration outages.
- Observability: Sentry optional; operational functions report structured errors.
- Accessibility: maintain readable contrast and usable controls across major screens.
- Logging discipline: avoid console logging sensitive data in production paths.

## System plan (high level)

### Components

- Frontend: Expo Router app surfaces in `app/`.
- Shared UI: reusable components in `components/`.
- App state: Zustand stores in `stores/`.
- Domain logic: deterministic evaluation and helpers in `utils/domain/`.
- Backend operations: Supabase edge functions in `supabase/functions/`.
- Database: Supabase migrations in `supabase/migrations/`.

### Data flow

1. Session state initializes through Supabase auth and route guard.
2. Dashboard summary loads (mock today; real-data path planned).
3. Facts are merged from linked/derived/manual sources.
4. FME evaluation computes recommendation, milestones, and trace.
5. UI surfaces recommendation and journey details.
6. Evaluation is logged for authenticated users.

### Key data entities

- Facts: `FactRecord`, `FactsSnapshot`, `FactRequest`.
- Evaluation: `FmeEvaluation`, `Recommendation`, `JourneyMilestone`, `ReasoningTrace`.
- Policy/rules: `PolicyBundle`, `PolicyPack`, `RulePack`.
- Logs and governance: `fme_evaluation_logs`, `policy_packs`, `rule_packs`, `policy_ops_*`.

## Milestones and deliverables

## Milestone 1: Canonical plan and baseline hardening (`DONE`)

- Goal: establish a durable source-of-truth plan and close obvious UX/consistency gaps in existing MVP loop.
- Deliverables:
- This `docs/PRODUCT_PLAN.md` file maintained as canonical plan.
- Docs index updated to include this file.
- Baseline backlog list for MVP hardening tasks that do not require new external integrations.
- Acceptance criteria:
- Plan is linked in docs index and reviewed by product/engineering.
- Baseline validation passes: `npm run validate`.

## Milestone 2: Core MVP loop reliability (`DONE`)

- Goal: make auth -> onboarding -> recommendation -> journey consistently reliable for manual/mock-first usage.
- Deliverables:
- Resolve TODO-only actions that block basic navigation (for example goals/insights placeholders).
- Improve recommendation explainability presentation from existing trace data.
- Confirm complete empty/loading/error coverage across dashboard tabs.
- Acceptance criteria:
- Happy path works end-to-end in local dev without manual patching.
- Failure path for data fetch and policy fetch is user-safe and non-blocking.

## Milestone 3: Real account data foundation (`DONE`)

- Goal: prepare secure data foundation for real account linking.
- Deliverables:
- Create missing migrations for transaction ingestion support tables used by edge functions.
- Align endpoint references in docs/client helpers with actual edge function strategy.
- Replace stubbed Plaid link path with sandbox-capable integration plan and initial implementation.
- Acceptance criteria:
- Database schema and functions align without undefined tables/RPC dependencies.
- Feature flag allows controlled rollout from mock to real data path.

## Milestone 4: Goals and insights MVP (`DONE`)

- Goal: replace hardcoded goals/insights with data-backed functionality.
- Deliverables:
- Goals CRUD model and screen wiring.
- Insights generation pipeline grounded in user facts/transactions.
- Remove remaining TODO placeholders in goals/insights screens.
- Acceptance criteria:
- Goals and insights screens operate from persisted user data.
- No hardcoded sample arrays required in production mode.

## Milestone 5: Operations and release readiness (`DONE`)

- Goal: tighten production operations and guardrails.
- Deliverables:
- Policy ops workflows and admin controls finalized for operators.
- Logging, analytics, and error-handling polish.
- Release checklist with operational runbook notes.
- Acceptance criteria:
- Production safety checks are documented and testable.
- Validation and smoke checks pass before release candidate.
- Current status note:
- Validation passes.
- Request-id correlation has been tightened on policy ops mutations and Plaid live-link flows (link token, token exchange, and linked-account fetch).
- Headless smoke evidence now covers auth/onboarding/dashboard/journey, goals create-refresh-progress, insights derivation, and mock linking.
- Sandbox function verification now succeeds end-to-end for link token creation, token exchange, and linked-account retrieval against deployed project.
- App-facing edge functions now include CORS/preflight handling for browser-based QA (`plaidLinkToken`, `plaidExchangeToken`, `plaidAccounts`, `logFmeEvaluation`).
- Real-summary rendering path has been headless-verified with `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true` and mock fallback disabled.
- Release-candidate approval recorded on 2026-02-19.

## Milestone 5.1: UI hardening + journey polish + FME accuracy (`DONE`)

- Goal: harden the user-facing recommendation loop under mock-only defaults before live-data transition.
- Scope lock:
- Enforce mock-first development defaults for upcoming UI/recommendation work: `EXPO_PUBLIC_USE_MOCK_DATA=true`, `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=false`, `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false`.
- Keep new dashboard/journey/onboarding improvements decoupled from direct Plaid edge-function coupling.
- Expand mock scenario coverage for empty, partial-fact, and policy-stale behavior paths.
- Harden `.agents/hooks/codex-autopilot.sh` around permission and context-write failures.
- Remove state ownership ambiguity in `stores/` before live-data expansion.
- Deliverables:
- Add `EXPO_PUBLIC_MOCK_SCENARIO` support and scenario fixtures.
- Add/expand tests for empty states, partial facts, and policy-stale recommendation behavior.
- Add stable UI test IDs for critical loop screens and actions.
- Add Maestro E2E smoke flow for auth/onboarding/dashboard/journey progression.
- Acceptance criteria:
- Mock-only mode reliably covers critical UI/FME paths without live-data coupling regressions.
- `npm run validate` passes.
- `npm run e2e` is available and documented for release smoke checks.
- Current status note:
- Mock scenario support and scenario-focused regression coverage are implemented.
- Journey/dashboard/profile UX hardening is complete, including hidden UI lab route access for development.
- Connection-health degradation UX is now explicit across Home, Journey, Insights, Profile, Step Detail, and Accounts.
- Ask prompts are now context-aware for Accounts and Profile in addition to Home/Roadmap/Insights/Step Detail.
- Autopilot failure handling and persisted preferences-store sanitization have been hardened.
- Acceptance criteria satisfied and validated in-repo.

## Milestone 6: Live Data Transition (`DONE`)

- Goal: move from mock-first reliability to controlled live-data rollout for Plaid-backed user summaries.
- Scope:
- Production-grade Plaid synchronization and token exchange hardening.
- Async ingestion reliability for webhook -> queue/raw -> normalized transaction paths.
- Controlled rollout and rollback of `EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK` and `EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA`.
- Deliverables:
- End-to-end live summary reliability criteria with request-id traceability.
- Ingestion reliability checkpoints for `plaidWebhook`, `raw_transactions`, `pending_insights`, and downstream summary consumers.
- Runbook/release updates for phased environment rollout and fallback handling.
- Acceptance criteria:
- Live summary path is reliable under internal QA and staged rollout.
- Live-data failures safely degrade to mock/manual fallback without blocking core user flows.
- All release gates pass before enabling production rollout flags.
- Current status note:
- Milestone 6 Phase A rollout-gating sequence is documented in the runbook and quality gates.
- Milestone 6 Phase A environment sequence and owner sign-off matrix is now documented for A1/A2/A3 promotion.
- Phase A rollout evidence log artifact is now available at `docs/operations/milestone-6-phase-a-evidence-log.md`.
- Automated Phase A request-id capture is now available via `npm run rollout:phase-a -- --phase ALL` (`scripts/milestone-6-phase-a-check.mjs`).
- Shared-QA A2/A3 request-id evidence has been captured and recorded in `docs/operations/milestone-6-phase-a-evidence-log.md` (2026-02-27 run artifact: `artifacts/rollout-phase-a/20260227-073559/`).
- Automated ingestion reliability checkpoint is now available via `npm run rollout:ingestion -- --window-hours 24` (`scripts/milestone-6-ingestion-check.mjs`).
- Ingestion checkpoint now supports active synthetic webhook probing with `--probe-webhook` when `PLAID_VERIFICATION_CODE` is available.
- `validate:env` now enforces strict boolean rollout flags and rejects invalid real-data combinations.
- Regression coverage now includes rollout-flag validation paths, and `npm run validate` passes on the latest transition-prep batch.
- Ingestion reliability checkpoint passed with warning count `0` on 2026-02-27 (`artifacts/rollout-ingestion/20260227-192840/`), including successful synthetic webhook probe and rollup probe.
- Agent interop gateway now supports authenticated non-dry-run `mock_agent_bridge` execution for deterministic QA validation while keeping external provider routing controls.
- Milestone 6 acceptance criteria are satisfied for the current non-production internal-QA rollout scope.

## Milestone 6.1: Automation simplification + quality gate alignment (`DONE`)

- Risk: `HIGH`
- Rationale: workflow automation, commit/delegation policy, and CI gate documentation are all being simplified together and can affect repo write behavior if misaligned.
- Goal: reduce passive repo-writing automation while preserving explicit quality gates.
- Deliverables:
- `Quality Checks` is the canonical PR quality gate and runs `npm run validate` plus `npm run check:instruction-drift`.
- `PR Autopilot` only runs from `workflow_dispatch` or explicit `/pr-autopilot` comment requests and cannot auto-merge.
- `CI Auto-Heal` becomes manual triage only, checks out the failing run revision by `run_id`, and does not create commits, PR comments, or Jules sessions by default.
- Broad issue escalation/remediation sweeps are removed so issue automation stays limited to lightweight triage/verification helpers.
- `Jules Gatekeeper Cloud` becomes report-only and no longer requests publish/autopublish follow-up.
- Local policy docs are aligned in `AI_RULES.md`, `CODEX.md`, `docs/operations/agent-orchestration.md`, and `docs/operations/quality-gates.md`.
- Jules-triggering scripts/workflows enforce the account cap of `100` sessions per rolling `24` hours.
- Acceptance criteria:
- No scheduled or passive workflow auto-merges or auto-creates remediation PRs.
- Local completion gate remains `npm run validate`.
- PR CI gate matrix is consistent across workflow YAML and documentation.
- A decision-complete execution packet exists for this slice under `docs/plans/`.
- Current status note:
- Completed on 2026-03-08.
- `Quality Checks` remains the canonical PR gate and runs `npm run validate` plus `npm run check:instruction-drift`.
- `PR Autopilot` now defaults lifecycle controls to off in-script, so background auto-merge/auto-delegate behavior stays disabled unless explicitly re-enabled.
- `CI Auto-Heal` remains manual `workflow_dispatch` triage by `run_id` with deterministic fixes/reruns/Jules/comments disabled by default.
- The GitHub-hosted `UI Review Automation` PR gate has been retired because it was not providing trustworthy signal; local `npm run ui:review` artifacts remain available for manual review.
- `Issue Escalation` has been retired so GitHub issue automation stays limited to lightweight triage/verification helpers instead of broad scheduled sweeps.
- `Jules Gatekeeper Cloud` remains report-only.
- `Actions Failure Autopilot` is now `workflow_dispatch`-only and defaults to report-only output (`ACTIONS_AUTOPILOT_WRITE_ISSUES=0`), with write-mode issue routing available only from an explicit manual dispatch input.

## Milestone 6.2: Repo optimization follow-through (`DONE`)

- Risk: `HIGH`
- Rationale: route ownership, tracked operational state, test harnesses, and manual cleanup tooling are being tightened together so feature work can resume on a simpler repo contract.
- Goal: finish the non-automation cleanup work needed to resume feature development cleanly.
- Deliverables:
- Exposed secret-like literals are scrubbed from tracked docs and generated local state stays untracked.
- `agentGateway` provider invocation logic is shared through a direct-import module instead of a source-eval Jest harness.
- `agent-hub` and `policy-ops` live under `app/(ops)`, while `ui-lab` lives under `app/(internal)`, with temporary dashboard redirects preserved for compatibility.
- `docs/SYSTEM_MAP.md` is kept short and validated by `npm run validate:system-map`.
- Manual branch retention reporting is available through `npm run branch:retention:report` and `npm run branch:retention:apply`.
- Acceptance criteria:
- `npm test -- __tests__/supabase/functions/agentGateway.test.ts` passes without `readFileSync` or `new Function`.
- Old dashboard-owned operator links redirect cleanly to the new route groups.
- `npm run validate` and `npm run check:instruction-drift` pass after doc cleanup.
- Branch cleanup remains manual-only and never depends on scheduled repo-writing automation.
- Current status note:
- Completed on 2026-03-08.
- Tracked secret scan and generated-state guardrails are active (`npm run validate:tracked-secrets`, `.gitignore` for generated memory state).
- `agentGateway` provider invocation is exercised through the direct-import harness and passes `npm test -- __tests__/supabase/functions/agentGateway.test.ts` without `readFileSync` or `new Function`.
- Canonical route ownership is enforced (`app/(ops)/agent-hub.tsx`, `app/(ops)/policy-ops.tsx`, `app/(internal)/ui-lab.tsx`) with dashboard aliases redirecting to those canonical routes.
- `docs/SYSTEM_MAP.md` remains concise and is enforced by `npm run validate:system-map`.
- Manual branch retention tooling is available and documented via `npm run branch:retention:report` and `npm run branch:retention:apply`.

## Milestone 7: Gatekeeper regression safety + post-MVP reliability baseline (`IN_PROGRESS`)

- Risk: `MED`
- Rationale: post-MVP reliability work is now spanning gatekeeper checkout safety, agent-runtime resilience, and client-state boundaries, so regressions can compound across developer workflows and core app surfaces.
- Goal: finish the practical reliability baseline needed before live-data work by hardening git/agent workflows and removing the most brittle remaining client-state boundary leaks.
- Deliverables:
- Lock in gatekeeper checkout safety with targeted regression coverage and safe checkout restoration behavior.
- Keep autopilot runtime behavior resilient when repo memory is unavailable and reduce duplicate theme-mode resolution paths.
- Move dashboard store-backed composition to hook-layer boundaries so pure dashboard helpers stay reusable and store-free.
- Keep one explicit in-progress milestone entry for the remaining reliability work before T8.
- Acceptance criteria:
- `npm run test -- __tests__/scripts/gatekeeperReportScript.test.ts` passes.
- `npm run test -- --runInBand __tests__/scripts/codexAutopilotHook.test.ts __tests__/theme/themeMode.test.tsx` passes.
- `npm run test -- --runInBand __tests__/hooks/useDashboardData.test.tsx __tests__/components/DashboardFallbackFlows.test.tsx __tests__/utils/dashboard.test.ts` passes.
- `npm run validate` passes with the new regression coverage included.
- Gatekeeper regression coverage verifies artifact generation and confirms no checkout-overwrite failure tied to `.agents/memory/rules.md`.
- Dashboard summary and FME helper logic remain store-free outside hook-layer wrappers.
- Current status note:
- Started on 2026-03-08.
- Completed slices:
  - Gatekeeper checkout regression coverage and checkout-context restoration are shipped.
  - Autopilot repo-memory fallback hardening and shared theme-mode resolution are shipped.
  - Dashboard state composition now lives in `hooks/useDashboardData.ts`, with pure helper coverage in `utils/dashboard.ts`.
- Remaining milestone focus:
  - finish any last justified client-state modularity cleanup and then close Milestone 7 before starting T8 live-data transition work.

## Task breakdown (execution plan)

| ID  | Title                                              | Objective                                                                             | Target area (paths)                                                                                                                                                      | Inputs/dependencies                                            | API/data touches                    | Output/artifacts                                                     | Test/verification                                             | Rollback note                              | Effort |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------ | ------ |
| T1  | Add canonical plan doc                             | Create and maintain source-of-truth development plan                                  | `docs/PRODUCT_PLAN.md`, `docs/README.md`                                                                                                                                 | Existing docs + repo state                                     | None                                | New plan doc and docs index link                                     | `npm run validate`                                            | Revert docs changes                        | S      |
| T2  | MVP loop hardening pass                            | Remove friction in existing manual/mock flow                                          | `app/(dashboard)/*`, `app/(onboarding)/index.tsx`, `components/dashboard/*`                                                                                              | Existing FME outputs and routes                                | None                                | UX and reliability refinements                                       | `npm run validate` + manual path check                        | Revert incremental commits                 | M      |
| T3  | Data integration gap closure                       | Remove schema/function mismatches in current stubs                                    | `supabase/migrations/*`, `supabase/functions/*`, `docs/reference/endpoints.md`                                                                                           | Existing schema and edge functions                             | Supabase tables/functions           | Migration + endpoint alignment                                       | Supabase local/dev checks + `npm run validate`                | Disable new paths via flags                | L      |
| T4  | Real-linking enablement                            | Implement non-mock account linking path                                               | `app/(auth)/plaid-link.tsx`, `utils/account.ts`, new edge functions                                                                                                      | Plaid credentials and env                                      | Plaid + Supabase                    | Initial real linking path                                            | Manual sandbox test + validation                              | Keep mock mode fallback                    | L      |
| T5  | Goals and insights data-backed MVP                 | Replace hardcoded arrays with persisted data                                          | `app/(dashboard)/goals.tsx`, `app/(dashboard)/insights.tsx`, `utils/queries/*`                                                                                           | New tables and query hooks                                     | Supabase tables                     | Working goals/insights MVP                                           | `npm run validate` + UI scenario checks                       | Fallback to empty states                   | L      |
| T6  | Mock-first hardening execution                     | Improve UI reliability and FME accuracy under mock-only defaults                      | `app/(dashboard)/*`, `app/(onboarding)/index.tsx`, `components/dashboard/*`, `utils/dashboard.ts`, `utils/domain/fme/*`                                                  | Existing MVP release candidate baseline                        | Mock data + policy/rule defaults    | Mock scenario fixtures, hardened UX, FME accuracy refinements        | `npm run validate` + scenario-focused tests + UI smoke checks | Keep rollout flags mock-only               | L      |
| T7  | Agent hooks and state modularity polish            | Remove execution brittleness and clarify client-state boundaries                      | `.agents/hooks/codex-autopilot.sh`, `stores/*`, `theme/paper.ts`                                                                                                         | Existing autopilot + Zustand stores                            | None                                | Hardened autopilot failure handling + modular store boundaries       | `npm run validate` + targeted store/hook checks               | Revert to prior scripts/stores             | M      |
| T8  | Live data transition implementation                | Transition from mock-first to production-grade live account data                      | `supabase/functions/*`, `supabase/migrations/*`, `utils/account.ts`, `utils/dashboard.ts`, docs runbooks/checklists                                                      | Milestone 5.1 hardening completion                             | Plaid + Supabase ingestion pipeline | Controlled live-data rollout with fallback guarantees                | Sandbox/live QA gates + `npm run validate` + release smoke    | Disable live flags and revert to mock mode | XL     |
| T9  | Automation simplification + quality gate alignment | Simplify passive repo-writing automation while preserving explicit validation quality | `.github/workflows/*`, `scripts/pr-autopilot.mjs`, `scripts/ci-auto-heal.mjs`, `AI_RULES.md`, `CODEX.md`, `docs/operations/*`, `.agents/memory/rules.md`, `docs/plans/*` | Current branch-sprawl baseline + existing automation workflows | GitHub Actions + local agent policy | Manual-trigger automation policy, aligned docs, and execution packet | `node --check` on edited scripts + `npm run validate`         | Revert workflow/script pairs and doc batch | M      |

## Critical path and parallel work

### Critical path (top 5 dependencies)

1. Plan doc adoption and milestone lock.
2. Mock-first UI/recommendation hardening completion (Milestone 5.1).
3. Mock-scenario coverage and FME accuracy verification.
4. Agent workflow + client-state modularity hardening.
5. Live-data transition workstream start (Milestone 6).

### Parallelizable work

- Journey/dashboard UI polish can run parallel with mock-scenario fixture expansion.
- FME accuracy tests can run parallel with autopilot hook hardening.
- Maestro E2E harness setup can run parallel with Zustand modularity cleanup.

## Risks and mitigations

| Risk                                 | Probability | Impact | Mitigation                                                 | Early warning signs                             |
| ------------------------------------ | ----------- | ------ | ---------------------------------------------------------- | ----------------------------------------------- |
| Mock-to-real integration drift       | Med         | High   | Keep feature-flagged dual paths and explicit parity checks | Real mode behaves differently from mock mode    |
| Schema mismatch with edge functions  | Med         | High   | Add migration-first workflow and contract checks           | Runtime insert/query failures in edge functions |
| Scope creep during MVP hardening     | Med         | Med    | Enforce `Must/Should/Could/Won't` at each milestone review | Unplanned tasks delaying core flow              |
| Sensitive logging exposure           | Low         | High   | Audit logging paths and remove payload-heavy logs          | Large structured objects in production logs     |
| Validation fatigue and skipped gates | Med         | High   | Require `npm run validate` at milestone completion         | Regressions found after merges                  |

## Assumptions and open questions

### Assumptions

- MVP can launch in manual/mock-first mode before real Plaid integration.
- iOS remains the only immediate target platform.
- Policy and rule remote fetch flags remain optional and safe-off by default.
- Current rollout target remains non-production internal QA; no additional compliance controls are required beyond education-mode posture for this draft stage.

### Open questions

- [Resolved 2026-02-27] No additional compliance/audit controls are required for the current non-production draft stage beyond the existing education-mode posture.
- [Non-blocking] Which additional mock scenarios should be promoted to always-on regression tests after Milestone 5.1?

## Definition of done

- Working build for scoped milestone.
- Tests pass for changed behavior.
- Docs updated to reflect behavior and operator expectations.
- Security basics in place (auth, authorization, secrets handling, sensitive logging control).
- Enough monitoring/logging exists to detect and triage failure modes.
- Required validation gate passes: `npm run validate`.

## Next 48 hours

1. Record owner sign-off for each phase promotion in release artifacts before any shared-environment flag change. Completed on 2026-02-27 in `docs/operations/milestone-6-phase-a-evidence-log.md` (A2 and A3 approval rows).
2. Run `npm run rollout:ingestion -- --window-hours 24` in shared QA and attach artifacts with triage notes for any warnings. Completed on 2026-02-27 with probe run (`artifacts/rollout-ingestion/20260227-192840/`) and warning count `0`.
3. Confirm whether additional compliance/audit controls are required beyond education-mode posture and document deltas. Completed on 2026-02-27 as a non-production draft-stage assumption (no new controls required at this stage).
4. Preserve milestone checkpoint discipline (`git status --short`, `git diff --name-only`, `git diff --cached --name-only`) for each scoped batch. Completed in current execution batches on 2026-02-28.

## Review Metadata

Review-Timestamp: 2026-03-02T02:35:07Z
Review-Artifact: artifacts/plan-reviews/20260301-213507-review.md
Review-Model: legacy-review-model

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-02T02:35:07Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260301-213507-review.md
Gemini-Review-Model: legacy-review-model

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-02T02:35:59Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260301-213559-product-plan-codex-approval.md
Codex-Approval-By: Codex
