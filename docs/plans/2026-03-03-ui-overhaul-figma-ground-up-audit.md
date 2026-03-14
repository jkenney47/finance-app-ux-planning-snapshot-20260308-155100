# UI Overhaul Figma Ground-Up Audit Plan (Phase 0.5)

Date: 2026-03-03
Owner: Codex
Status: Draft

## Objective

Retrofit the new Figma workflow onto the existing UI overhaul without restarting implementation.

This phase creates a baseline Figma reference from the current app, audits current work against the source-of-truth UI spec, runs Gemini review gates, and then continues the existing UI roadmap from the current state.

## Scope

- Included user-facing screens:
  - Onboarding
  - Home
  - Roadmap (Journey)
  - Step Detail
  - Insights
  - Profile
  - Accounts
  - Goals
  - Plaid link
- Included ops surfaces:
  - Agent Hub
  - Policy Ops
- Excluded:
  - Re-architecting IA
  - Restarting design implementation from scratch

## Preconditions

1. Figma MCP auth check succeeds (`mcp__figma__whoami`).
2. Figma API auth check succeeds (`npm run figma:api:check`).
3. Plan gate is finalized before implementation-path commits:
   - Gemini review metadata exists
   - Codex final approval metadata exists

## Deliverables

1. Baseline Figma file
   - Name: `FinancePal UI Baseline (Audit 2026-03-03)`
   - Source: Captured current app surfaces (no redesign pass).
2. Node map doc:
   - `docs/ux/figma-node-map.md`
   - Fields: route, fileKey, nodeId, figma URL, capture notes.
3. Ground-up audit report:
   - `docs/ux/ui-overhaul-ground-up-audit-2026-03-03.md`
   - Includes pass/fail matrix and required remediations.
4. Screenshot artifacts:
   - `artifacts/ui-audit-screenshots/<timestamp>/`
   - iOS simulator screenshots for all key surfaces.

## Execution Sequence

### Step A: Finalize this plan with Gemini + Codex

1. Run:
   - `npm run plan:finalize -- docs/plans/2026-03-03-ui-overhaul-figma-ground-up-audit.md "Phase 0.5 finalized for Figma baseline + spec audit + continued roadmap execution"`
2. Confirm outputs:
   - Plan contains `Gemini-Review-*` metadata.
   - Plan contains `Codex-Approval-*` metadata.
   - `.agents/plan/current-plan.txt` points to this plan.

### Step B: Build baseline Figma reference from current UI

1. Start web preview in mock-first mode.
2. Capture current routes to Figma using MCP capture flow.
3. Record `fileKey` and per-screen `nodeId` entries in `docs/ux/figma-node-map.md`.

### Step C: iOS screenshot set for review loop

1. Preferred path: Maestro-based capture after Java runtime availability.
2. Fallback path: `xcrun simctl io booted screenshot` per target screen.
3. Store screenshots in `artifacts/ui-audit-screenshots/<timestamp>/`.

### Step D: Ground-up spec audit against current implementation

Audit each screen/component against UI source-of-truth requirements:

1. Palette/token compliance (no hardcoded colors, semantic token use).
2. Trust-by-explanation blocks present and ordered correctly.
3. Step semantics: setup vs threshold vs maintain behavior.
4. Measurement disclosures and rationale are present where required.
5. Ask FAB context anchors on all relevant screens.
6. Insights defaults: smoothed trends, interpretation paired with actions.
7. Calm language/tonal guardrails are preserved.

Record findings and fixes in `docs/ux/ui-overhaul-ground-up-audit-2026-03-03.md`.

### Step E: Gemini post-audit review and validation

1. Run diff review:
   - `npm run gemini:collab:diff -- app components utils stores theme docs scripts maestro`
2. Run screenshot review for captured iOS assets:
   - `npm run gemini:collab:screenshot -- <absolute_screenshot_path> "<screen context>"`
3. Run full validation:
   - `npm run validate`

## Acceptance Criteria

1. Plan is finalized with Gemini and Codex metadata.
2. Baseline Figma file exists and is documented in node map.
3. Audit report exists with explicit pass/fail findings.
4. Required remediations from audit are implemented.
5. Gemini diff/screenshot reviews are completed and addressed.
6. `npm run validate` passes.
7. Existing UI roadmap implementation resumes after this phase, not a reset.

## Risks and Mitigations

1. Maestro screenshot automation blocked by missing Java runtime.
   - Mitigation: use iOS simctl fallback capture path.
2. Figma capture drift due to unstable app states.
   - Mitigation: enforce mock-first scenario for all captures.
3. Over-scoping audit into redesign.
   - Mitigation: audit-only framing; fix only spec gaps and defects.

## Assumptions

1. Code tokens remain source-of-truth; Figma is reference and review anchor.
2. Hybrid fidelity applies:
   - Pixel-perfect for hero surfaces
   - Pragmatic consistency for secondary surfaces.
3. Existing implementation remains the foundation for next roadmap steps.

## Gemini Review Metadata

Gemini-Review-Timestamp: 2026-03-03T02:44:34Z
Gemini-Review-Artifact: artifacts/plan-reviews/20260302-214434-2026-03-03-ui-overhaul-figma-ground-up-audit.md
Gemini-Review-Model: gemini-3.1-pro-preview

## Codex Final Approval Metadata

Codex-Plan-Approval: APPROVED
Codex-Approval-Timestamp: 2026-03-03T02:44:58Z
Codex-Approval-Artifact: artifacts/codex-approvals/20260302-214458-2026-03-03-ui-overhaul-figma-ground-up-audit-codex-approval.md
Codex-Approval-By: Codex
