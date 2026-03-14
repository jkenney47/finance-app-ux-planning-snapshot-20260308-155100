# UI Overhaul Progress (2026-03-02)

This tracks implementation status against the Finance App UI/UX source-of-truth spec.

## Completed in this pass

- Home now enforces a 3-action surface using transparent fallback alternatives when modeled options are sparse.
- Step Detail now guarantees at least two alternatives via modeled options + explicit strategy alternatives.
- Step Detail includes a skeleton loading state to match Home/Roadmap loading behavior.
- Threshold/maintain measurement copy now explicitly follows cadence rules:
  - paycheck metrics: last 2 pay periods
  - balance thresholds: 30-day median daily balance
  - trend thresholds: rolling 60-90 day windows
  - debt payoff: direct principal/APR without smoothing
- Insights now treats net worth as tap-to-expand (secondary by default) and includes a dedicated "What I used" block.
- Ask context anchoring expanded:
  - Accounts sets `metricId` for connection-health/account-link context.
  - Goals sets `metricId` for goal-funding/setup context.
  - Ask prompt library now includes goals-specific prompts and friendly labels for new metric IDs.
- Option cards now use a real button for "View details" to improve tap affordance/accessibility.

## Existing capabilities preserved

- Global Ask FAB + Ask sheet remain active on all dashboard routes.
- Roadmap still supports Now/All/Completed filters and stage timeline.
- Connection-health degradation remains explicit without alarmist language.
- Coverage confidence remains visible across Home, Roadmap, Step Detail, Insights, Onboarding, and Profile.

## Validation status

- `npm run validate` passes after this batch.

## Completed in follow-up pass (2026-03-03)

- Screenshot review gate is now unblocked and completed with the legacy external reviewer.
- Corrected invalid Home audit evidence capture:
  - Replaced `home_dashboard.png` with a valid Home screen render.
  - Preserved prior unmatched-route capture as `home_dashboard_unmatched_route.png`.
- Removed redundant Home stage subtext copy ("You are in ...") to reduce header repetition.
- Increased Home scroll bottom clearance to prevent Ask FAB overlap with trailing CTAs.
- Added dedicated screen-level regression tests for:
  - Home strategy fallback now-actions rendering
  - Step Detail synthetic alternatives when modeled options are sparse

## Remaining UI fidelity opportunities

- Optional: Add a small in-app indicator when a strategy alternative is synthetic (non-modeled) to further strengthen transparency.
