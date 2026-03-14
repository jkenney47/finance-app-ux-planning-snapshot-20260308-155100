# Plan: <Title>

Date: <YYYY-MM-DD>
Owner: <name or team>
Status: Draft

After implementation, summarize execution and validation using `AGENT_TASK_TEMPLATE.md`.

## Links

- Issue: <github issue link or N/A>
- PR: <draft PR link or N/A>
- Active plan pointer: `.agents/plan/current-plan.txt`

## Scope

### In Scope

- <item>

### Out of Scope

- <item>

## Risk Tier

- Tier: `LOW` | `MED` | `HIGH`
- Rationale: <why this tier applies>
- Multi-agent required: <yes/no>
- Trigger(s): <why this is LOW vs MED/HIGH>

## Target Paths

- `<path>`

## Design Reference (Optional If UI Touched)

- Routes/screens touched:
- Design artifact path(s) (or "N/A"):
- Screenshot packet path (or "N/A" for non-screen component work):
- Mapping updates required: yes/no / N/A
- Sync method: screenshot refresh vs implementation-only / N/A

## UI Validation Checklist (Required If UI Touched)

- iOS Simulator: small iPhone + large iPhone + iPad
- Dynamic Type: max accessibility size
- Appearance: light + dark
- States verified: Loading / Empty / Error / Offline/Degraded
- Automated run: `npm run ui:review`
- Evidence (required): `artifacts/ui-review/<timestamp>/`

## User-Facing States (Required If UI Touched)

- Loading: <expected behavior>
- Empty: <expected behavior>
- Error: <expected behavior>
- Offline/Degraded: <expected behavior>

## Accessibility (Required If UI Touched)

- Labels and roles: <requirements>
- Focus and announcements: <requirements>
- Tap target size and spacing: <requirements>
- Text scaling and truncation handling: <requirements>

## Implementation Steps

1. <step>
2. <step>
3. <step>

## Test Plan

- Jest updates:
- Maestro updates:
- Manual smoke checks:

## Rollback

- Primary rollback path:
- Fallback/feature-flag path:

## Observability

- Logs/request IDs to verify:
- Alerting or anomaly signals:

## Delegation

- Additional reviews to run:
- Jules handoff required: yes/no
- If yes, trigger and expected outputs:

## Workflow State

- Current state: `Planned` | `In Progress` | `Human Review` | `Rework` | `Done`
