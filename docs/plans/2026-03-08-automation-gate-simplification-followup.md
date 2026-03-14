# Execution Packet: Automation Gate Simplification Follow-Up

Date: 2026-03-08
Owner: Product + Engineering
Status: Planned

## Links

- Product plan: `docs/PRODUCT_PLAN.md`
- Canonical orchestration policy: `docs/operations/agent-orchestration.md`
- Quality gate reference: `docs/operations/quality-gates.md`
- Active plan pointer (updated by finalize): `.agents/plan/current-plan.txt`

## Goal Summary

Land the pending workflow/policy cleanup that is already staged in the repo direction:

1. retire broad issue-escalation automation
2. retire the GitHub-hosted UI review PR gate
3. keep one canonical CI quality path through `npm run validate`
4. align the live docs with the actual gate matrix

This slice should reduce passive automation and ambiguity without weakening the required validation bar.

## Scope

### In Scope

- Delete `.github/workflows/issue-escalation.yml`.
- Delete `scripts/issue-escalation.mjs`.
- Delete `.github/workflows/ui-review.yml`.
- Simplify `.github/workflows/lint.yml` so it relies on the canonical `npm run validate` step.
- Update live operator/docs files so they describe the current gate matrix and local/manual UI review path.
- Update `docs/README.md` so historical execution packets are clearly secondary to the live product/operations docs.
- Keep the product plan wording aligned with the shipped workflow posture.

### Out of Scope

- No new automation workflows.
- No changes to product runtime behavior.
- No new CI providers, scheduled write-capable jobs, or background remediation loops.
- No edits to historical plan artifacts beyond leaving them as archived context.

## Risk Tier

- Tier: `HIGH`
- Rationale: workflow deletion and CI-policy changes can silently weaken enforcement or confuse operator behavior if the gate matrix and docs drift apart.

## Repo Truth

- `npm run validate` already includes `validate:case-collisions`, so keeping that as a separate `lint.yml` step duplicates the canonical gate.
- Local UI review remains available through `npm run ui:review` and `scripts/ui-review.sh`; the GitHub-hosted `ui-review.yml` gate is extra process, not the canonical completion gate.
- Broad issue-escalation automation conflicts with the repo's current direction toward read-only or explicitly triggered automation.
- The dirty worktree already reflects the intended simplified end state across workflow YAML and live docs, but the slice still needs a dedicated execution packet and full validation before shipping.

## Exact Files To Ship

- `docs/plans/2026-03-08-automation-gate-simplification-followup.md`
- `.agents/plan/current-plan.txt`
- `.github/workflows/issue-escalation.yml`
- `.github/workflows/ui-review.yml`
- `.github/workflows/lint.yml`
- `scripts/issue-escalation.mjs`
- `DEVELOPMENT.md`
- `docs/README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/SYSTEM_MAP.md`
- `docs/operations/agent-orchestration.md`
- `docs/operations/quality-gates.md`

## Acceptance Criteria

- No live workflow or script remains for broad issue-escalation/remediation sweeps.
- No GitHub PR gate remains for hosted UI review; manual `npm run ui:review` guidance stays documented.
- `Quality Checks` still runs the canonical `npm run validate` path plus `npm run check:instruction-drift`.
- Live docs and workflow YAML describe the same CI gate matrix.
- `npm run validate` passes after the deletions and doc alignment.

## Implementation Order

1. Finalize this plan:

```bash
npm run plan:finalize -- docs/plans/2026-03-08-automation-gate-simplification-followup.md "Finalize the automation gate simplification follow-up and align live gate docs with shipped workflow policy."
```

2. Review the pending workflow/doc deletions for dangling live references.
3. Keep only the live docs that need updating; leave historical `docs/plans/` artifacts unchanged.
4. Run full validation and the commit checkpoint.
5. Commit, push, open a PR, and merge only after hosted checks pass.

## Validation Commands

Run in this order:

```bash
npm run plan:finalize -- docs/plans/2026-03-08-automation-gate-simplification-followup.md "Finalize the automation gate simplification follow-up and align live gate docs with shipped workflow policy."
npm run check:instruction-drift
npm run validate
git status --short
git diff --name-only
git diff --cached --name-only
```

Expected checkpoint decision after validation: `Commit now` if the slice remains one coherent workflow/policy batch and the hosted checks go green.

## Rollback

- Restore `.github/workflows/issue-escalation.yml` and `scripts/issue-escalation.mjs` together if issue automation must be reintroduced.
- Restore `.github/workflows/ui-review.yml` together with the docs that describe it if hosted UI review becomes required again.
- Revert the `lint.yml` simplification and doc updates together so CI behavior and operator docs stay aligned.

## Done Criteria

- Workflow deletions and gate simplification are reflected consistently in live docs.
- No live reference implies the retired workflows are still part of the active gate matrix.
- `npm run validate` passes.
- Hosted PR checks pass on the branch before merge.

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-08T16:54:07Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260308-125407-2026-03-08-automation-gate-simplification-followup.md
Gemini-Review-Model: gemini-3.1-pro-preview

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-08T16:54:34Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260308-125434-2026-03-08-automation-gate-simplification-followup-codex-approval.md
Codex-Approval-By: Codex
