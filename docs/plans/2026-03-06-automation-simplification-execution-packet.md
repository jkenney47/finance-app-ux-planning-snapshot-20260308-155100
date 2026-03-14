# Execution Packet: Automation Simplification + Quality Gate Alignment

Date: 2026-03-06
Owner: Product + Engineering
Status: Done

## Links

- Product plan: `docs/PRODUCT_PLAN.md`
- Active plan pointer (update before implementation): `.agents/plan/current-plan.txt`

## Scope

### In Scope

- Simplify PR/Jules automation so unattended workflows stop writing branches/PRs by default.
- Preserve quality through `npm run validate`, `lint.yml`, `plan-gate.yml`, and `ui-review.yml`.
- Align local policy docs with the new explicit-trigger automation policy.
- Add this slice to the canonical product plan.

### Out of Scope

- No feature work on product surfaces.
- No route refactors, store refactors, or Supabase runtime changes.
- No branch cleanup automation in this slice.

## Risk Tier

- Tier: `HIGH`
- Rationale: this changes GitHub Actions behavior, repo-writing automation rules, and the local agent policy that governs commit/delegation behavior.

## Repo Truth

- Open PR count is `0` as of 2026-03-06.
- Remote branch count is `268` as of 2026-03-06.
- Current automation problem is passive write-capable automation plus branch sprawl, not active PR backlog.
- Write-capable automation exists in:
  - `.github/workflows/pr-autopilot.yml`
  - `.github/workflows/ci-auto-heal.yml`
  - `.github/workflows/issue-escalation.yml`
  - `.github/workflows/jules-gatekeeper-cloud.yml`
  - `scripts/pr-autopilot.mjs`
  - `scripts/ci-auto-heal.mjs`
  - `scripts/issue-escalation.mjs`
  - `scripts/jules-autopublish.mjs`
- Quality must remain enforced by:
  - `.github/workflows/lint.yml`
  - `.github/workflows/plan-gate.yml`
  - `.github/workflows/ui-review.yml`
  - `npm run validate`

## Exact Files To Edit

- `.github/workflows/lint.yml`
- `.github/workflows/pr-autopilot.yml`
- `scripts/pr-autopilot.mjs`
- `.github/workflows/ci-auto-heal.yml`
- `scripts/ci-auto-heal.mjs`
- `.github/workflows/issue-escalation.yml`
- `scripts/issue-escalation.mjs`
- `.github/workflows/jules-gatekeeper-cloud.yml`
- `.github/workflows/actions-failure-autopilot.yml`
- `AI_RULES.md`
- `CODEX.md`
- `docs/operations/agent-orchestration.md`
- `docs/operations/quality-gates.md`
- `.agents/memory/rules.md`
- `docs/PRODUCT_PLAN.md`
- `scripts/actions-failure-autopilot.mjs`
- `__tests__/scripts/actionsFailureAutopilotScript.test.ts`

## No-Change Decision

- Do not edit `scripts/jules-autopublish.mjs` in this slice.
- Reason: removing the auto-publish invocation from `jules-gatekeeper-cloud.yml` is sufficient to stop unattended repo-writing behavior. Script deletion or deeper refactor can happen in a later cleanup slice.

## Target Behavior

### 1. Canonical PR quality gate

- `lint.yml` becomes the single explicit PR quality check.
- `Quality Checks` runs:
  1. `npm run validate`
  2. `npm run check:instruction-drift`
- The written gate matrix in docs must match this exact behavior.

### 2. PR Autopilot becomes explicit-trigger only

- `pr-autopilot.yml` may run only from:
  - `workflow_dispatch`
  - PR comment command `/pr-autopilot`
- Remove passive PR/review/schedule triggers.
- `scripts/pr-autopilot.mjs` must ignore issue comments unless the comment explicitly contains `/pr-autopilot`.
- Disable:
  - backlog scanning
  - PR lifecycle automation
  - auto-merge
  - draft auto-delegation
  - automatic AI-thread resolution
- Output stays limited to attended/manual follow-up actions.

### 3. CI Auto-Heal becomes manual triage only

- `ci-auto-heal.yml` becomes `workflow_dispatch` only.
- Manual input must identify the failed run to inspect.
- `scripts/ci-auto-heal.mjs` must default to non-writing triage:
  - no deterministic fix commits
  - no failed-job reruns
  - no PR comments
  - no Jules session creation
- Expected output is diagnosis plus manual next-step guidance only.

### 4. Issue Escalation keeps reminders but loses automatic remediation

- `issue-escalation.yml` may still run on schedule for stale reminders and labels.
- `issue-escalation.yml` may still run on `issue_comment`, but remediation delegation only occurs when the comment explicitly contains `/auto-remediate`.
- `scripts/issue-escalation.mjs` must not delegate remediation from:
  - schedule runs
  - generic human comments
  - blanket scan of all open issues
- Automatic stale labeling/commenting remains allowed.

### 5. Jules Gatekeeper Cloud becomes report-only

- `jules-gatekeeper-cloud.yml` keeps the recurring gatekeeper report.
- Remove the `scripts/jules-autopublish.mjs` step.
- Remove deferred publish queue cache handling tied only to autopublish.
- This workflow must not create draft PRs or publish follow-up changes.

### 6. Local policy docs align to explicit Jules usage

- `AI_RULES.md`, `CODEX.md`, `.agents/memory/rules.md`, and `docs/operations/agent-orchestration.md` must all say the same thing:
  - Codex does not commit unless the user explicitly says `commit now`.
  - Jules delegation is explicit, not autonomous.
  - Acceptable Jules triggers are:
    - direct user request
    - explicit attended/manual workflow trigger documented in repo policy
    - true cloud-only follow-up after local implementation where a human intentionally starts the handoff
  - Background workflows must not auto-merge or auto-create remediation PRs.

### 7. Quality gate docs become unambiguous

- `docs/operations/quality-gates.md` must document:
  - local required gate: `npm run validate`
  - required PR CI gates:
    - `Quality Checks`
    - `Gemini+Codex Plan Gate`
    - conditional `UI Review`
  - automation safety rule:
    - unattended workflows may report, label, or comment
    - unattended workflows may not auto-merge or auto-create remediation PRs

### 8. Canonical roadmap records the slice

- `docs/PRODUCT_PLAN.md` adds a dedicated milestone/work item for this automation simplification slice.
- Status should be `DONE` once acceptance criteria are met.
- Risk must be `HIGH` with rationale.

### 9. Actions failure autopilot defaults to manual report mode

- `.github/workflows/actions-failure-autopilot.yml` runs only via `workflow_dispatch`.
- Default behavior is report-only (`ACTIONS_AUTOPILOT_WRITE_ISSUES=0`).
- Incident issue creation remains available only through explicit manual dispatch input.
- `scripts/actions-failure-autopilot.mjs` and its regression tests cover:
  - report-only behavior
  - no-token report path
  - explicit write-enabled path

## Implementation Order

1. Update `docs/PRODUCT_PLAN.md` with the milestone entry for this slice.
2. Finalize this packet as the active plan before implementation.
3. Simplify workflow YAML files.
4. Align the three automation scripts to the new trigger model.
5. Update local policy docs and memory rules.
6. Run validation and commit checkpoint.

## Validation Commands

Run in this order:

```bash
npm run plan:finalize -- docs/plans/2026-03-06-automation-simplification-execution-packet.md "Automation simplification slice"
node --check scripts/pr-autopilot.mjs
node --check scripts/ci-auto-heal.mjs
node --check scripts/issue-escalation.mjs
npm run validate
git status --short
git diff --name-only
git diff --cached --name-only
```

Expected checkpoint decision after validation: `Wait` unless the user explicitly requests a commit.

## Rollback

- Revert workflow/script pairs together, not individually:
  - `pr-autopilot.yml` + `scripts/pr-autopilot.mjs`
  - `ci-auto-heal.yml` + `scripts/ci-auto-heal.mjs`
  - `issue-escalation.yml` + `scripts/issue-escalation.mjs`
- If `lint.yml` simplification causes unexpected CI regressions, restore the prior job shape temporarily but keep the docs gate matrix aligned with the active workflow.
- If policy docs drift from workflow reality, fix the docs rather than re-enabling passive repo-writing automation.
- Do not revert unrelated generated-memory changes in `.agents/memory/events.ndjson` or `.agents/memory/index.json`.

## Done Criteria

- No scheduled or passive workflow auto-merges PRs.
- No scheduled or passive workflow auto-creates remediation PRs.
- `Quality Checks` and written docs describe the same gate matrix.
- Jules usage is explicit across repo policy docs.
- The slice is tracked in `docs/PRODUCT_PLAN.md`.

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-06T12:03:18Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260306-070318-2026-03-06-automation-simplification-execution-packet.md
Gemini-Review-Model: gemini-3.1-pro-preview

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-06T12:03:46Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260306-070346-2026-03-06-automation-simplification-execution-packet-codex-approval.md
Codex-Approval-By: Codex
