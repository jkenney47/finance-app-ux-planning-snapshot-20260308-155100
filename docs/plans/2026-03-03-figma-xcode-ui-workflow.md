# Plan: UI Workflow (Figma Sync + Xcode Validation)

Date: 2026-03-03
Owner: Codex
Status: Draft

After implementation, summarize execution and validation using `AGENT_TASK_TEMPLATE.md`.

## Links

- Issue: N/A
- PR: N/A
- Active plan pointer: `.agents/plan/current-plan.txt`

## Scope

### In Scope

- Establish a clear rule for when to use Figma vs Xcode during UI development.
- Require Figma to stay in sync for all UI changes (design spec and/or baseline captures).
- Add a strict iOS validation checklist for UI changes (simulator sizes, dynamic type, landscape, VoiceOver).
- Update docs/templates so the workflow is consistently applied on every UI task.

### Out of Scope

- No runtime code changes to `app/`, `components/`, etc.
- No changes to existing GitHub Actions workflows.
- No new third-party services.

## Risk Tier

- Tier: `MED`
- Rationale: Process/docs changes affect execution quality and correctness of UI work, but do not change app runtime behavior directly.

## Target Paths

- `docs/ux/ui-development-workflow.md`
- `docs/PRODUCT_PLAN.md`
- `docs/operations/agent-orchestration.md`
- `docs/operations/figma-mcp-and-api.md`
- `docs/templates/agent-spec.md`
- `docs/README.md`
- `.agents/memory/rules.md`

## User-Facing States (Required If UI Touched)

- Not applicable. No UI surface is changed.

## Accessibility (Required If UI Touched)

- Not applicable. No UI surface is changed.

## Implementation Steps

1. Create a single authoritative UI workflow doc: `docs/ux/ui-development-workflow.md`.
2. Add a short `UI Workflow (Figma + Simulator/Xcode)` policy section to `docs/PRODUCT_PLAN.md` that points to the canonical workflow doc.
3. Update `docs/operations/agent-orchestration.md` to require:
   - Figma sync for all UI changes.
   - strict iOS validation for all UI changes.
4. Expand `docs/operations/figma-mcp-and-api.md` with a clear "UI Sync after every UI change" section that references:
   - `docs/ux/ui-development-workflow.md`
   - `docs/ux/figma-node-map.md`
5. Extend `docs/templates/agent-spec.md` with two required sections when UI is touched:
   - Figma reference (fileKey/node IDs/routes)
   - UI validation checklist (sizes, dynamic type, landscape, VoiceOver, states)
6. Update docs index entries in `docs/README.md` (include the workflow doc and ensure templates are correct).
7. Update `.agents/memory/rules.md` to persist the new workflow preferences (Figma always-sync + strict UI validation).

## Test Plan

- Jest updates: none expected.
- Maestro updates: none expected.
- Manual smoke checks:
  - Confirm all referenced docs paths exist.
  - Confirm `docs/README.md` no longer references missing template files.
  - Confirm the plan template explicitly requires Figma references and strict UI validation for UI work.
  - Run `npm run validate`.

## Rollback

- Primary rollback path: revert the docs commit that introduced these workflow changes.

## Observability

- N/A (process/docs only).

## Delegation

- Gemini reviews to run:
  - `npm run plan:review -- docs/plans/2026-03-03-figma-xcode-ui-workflow.md`
  - `npm run gemini:collab:diff -- docs`
- Jules handoff required: no.

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-04T01:48:50Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260303-204850-2026-03-03-figma-xcode-ui-workflow.md
Gemini-Review-Model: gemini-3.1-pro-preview

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-04T01:49:26Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260303-204926-2026-03-03-figma-xcode-ui-workflow-codex-approval.md
Codex-Approval-By: Codex
