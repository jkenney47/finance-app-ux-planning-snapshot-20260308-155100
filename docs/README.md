# Docs Index

Use this file as the canonical entrypoint for documentation routing.

## First Pass

- `AI_RULES.md`
- `DEVELOPMENT.md`
- `docs/SYSTEM_MAP.md`

## Agent Entry Pointer

- `START_HERE.md` (short canonical pointer to the first-pass docs above)
- `CODEX.md` (Codex-only supporting pointer)

## Supporting/Runtime (Non-Canonical)

- `AGENTS.md` (operator convenience summary)
- `.agents/memory/rules.md` (local runtime memory and preferences)

## Active Product Docs

- `docs/architecture/ai-financial-advisor-design-doc.md` (canonical product/design intent: vision, UX principles, system direction)
- `docs/PRODUCT_PLAN.md` (canonical live execution plan: scope, sequencing, status, definition of done)

Keep these paired docs aligned:

- Update the design doc when product vision, UX principles, or major experience direction changes.
- Update the product plan when milestone order, implementation status, active scope, or acceptance criteria changes.
- If one change affects both intent and execution, update both in the same slice.

## Active Reference

- `docs/reference/endpoints.md`

## UX and Quality

- `docs/ux/ui-ux-review-2026-02-26.md`
- `docs/ux/ui-development-workflow.md` (canonical UI implementation + simulator review loop)

## Operations and Release

- `docs/operations/runbook.md`
- `docs/operations/agent-orchestration.md` (canonical orchestration runbook)
- `docs/operations/codex-multi-agent.md` (Codex role-workflow detail)
- `docs/operations/agent-ops-optimization.md`
- `docs/operations/agent-only-readiness.md`
- `docs/operations/quality-gates.md`
- `docs/operations/skill-invocation-tuning.md`
- `.agents/plan/current-plan.txt` (active plan pointer for implementation gate)
- `docs/operations/milestone-6-phase-a-evidence-log.md`
- `docs/release/mvp-release-checklist.md`

## Templates and Task Plans

- `docs/templates/agent-spec.md`
- `docs/templates/handoff.md`
- `docs/plans/` (per-task implementation plans and historical execution records; live workflow policy and current scope still come from `docs/PRODUCT_PLAN.md` plus the active operations docs above)
