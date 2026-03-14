# Agent-Only Readiness Scorecard

Last updated: 2026-03-05
Audience: Product + Engineering operators

## Purpose

Define objective criteria for when agent-first execution can expand safely toward broader agent-only operation.

## Review cadence

- Review weekly.
- Promotion decisions use a rolling 4-week window.

## Required metrics

1. Validate first-pass success rate on agent-driven tasks >= 95%.
2. Agent-caused `P0/P1` incidents = 0.
3. Agent-caused rollback-required incidents <= 1 per 20 tasks.
4. Plan/metadata gate compliance = 100% on implementation-path commits.
5. At least one successful rollback drill is documented in the window.
6. Weekly orchestration doc audit completed (stale/conflicting guidance corrected).

## Promotion rule

Promote broader agent-only scope only when all six metrics pass for the full 4-week window.

## Hold/demotion rule

If any metric fails:

1. Keep or return to phased mode.
2. Open corrective actions with owners and due dates.
3. Re-evaluate after a new 4-week window.

## Evidence sources

- `npm run validate` output logs
- `artifacts/` validation packets
- incident/rollback notes in operations docs
- pre-commit/plan guard outcomes

## Reporting template

- Window: <start> to <end>
- Score: <passed metrics>/6
- Promotion decision: <yes/no>
- Blockers: <list>
- Corrective actions: <list with owner/date>
