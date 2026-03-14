# Gemini Plan Review

- Plan: `docs/plans/2026-03-03-recommendation-state-red-team-phase-plan.md`
- Generated-At-UTC: 2026-03-04T01:51:54Z
- Model: gemini-3.1-pro-preview

Here is a senior review of the proposed Phase Plan, focused on risks, missing elements, and simplification.

### 1. Risks (P0/P1/P2)
*   **P0: "Staleness" Definition:** The plan states `stale data -> Hold steady`, but does not define the threshold for "stale" (e.g., accounts not synced in 24 hours vs. 30 days). If set too aggressively, users will permanently see `Hold steady` and ignore the feature.
*   **P1: Conflict Resolution Dead-Ends:** When local stage input conflicts with data (Milestone 3), showing a "reconcile prompt" and forcing `Hold steady` risks frustrating the user if they don't know *how* to resolve the conflict. There must be an explicit "Dismiss/Ignore my input" escape hatch.
*   **P2: Feature Flag Leakage:** Ensuring the feature flag robustly guards not just the UI, but the underlying engine calculations to prevent background performance degradation when toggled off.

### 2. Missing Steps or Hidden Dependencies
*   **New User / Empty State Collision:** For a brand-new user with zero linked accounts, routing them into the `Hold steady` recommendation logic is semantically confusing. There should be a bypass for "Onboarding" or "Setup Incomplete" before the engine evaluates.
*   **Feature Flag Propagation:** The plan needs an explicit step for threading the feature flag down to the shared decision selector so that legacy surfaces don't accidentally consume the new data model before they are ready.

### 3. Frontend State Coverage (UI)
*   **Loading State:** The plan lacks definition for the engine's evaluation loading state. The UI must define whether to show a skeleton loader or cache the previous recommendation while recalculating.
*   **Offline State:** If the app is offline and cannot refresh data, does it fall back to `Hold steady` (due to staleness) or show an "Offline - showing cached recommendation" banner? The UI needs an explicit offline representation.

### 4. Accessibility Risks
*   **Color as Information:** `Act now` (likely a vibrant/alert color) and `Hold steady` (likely muted) must not rely solely on color to convey status. Icons or explicit text labels are required.
*   **Reconcile Prompt Focus Management:** The conflict handling UI (reconcile prompt) must correctly trap focus and use `role="alertdialog"` to ensure screen reader users are immediately aware of the conflict.
*   **Trigger Condition Association:** Screen readers must logically group the `Hold steady` status with its associated unlock triggers, rather than reading them as disconnected lists.

### 5. Concrete Tests to Add
*   **Engine Tests:**
    *   `evaluates_to_hold_steady_when_data_is_older_than_staleness_threshold()`
    *   `evaluates_to_act_now_only_when_confidence_is_above_0_72()`
*   **Integration/UI Tests:**
    *   `home_journey_and_insights_render_identical_modes_for_same_snapshot()`
    *   `hold_steady_renders_explicit_unlock_triggers_when_data_is_missing()`
*   **Conflict Tests:**
    *   `user_is_prompted_to_reconcile_when_local_stage_overrides_hard_financial_data()`

### 6. Simpler Alternatives
*   **Drop Milestone 3 (Local Stage Input) for V1:** The core value of this phase is establishing a deterministic, data-driven engine with cross-screen consistency (Milestones 1 & 2). Adding user-provided "soft signals" (Milestone 3) introduces massive complexity (conflict states, reconcile prompts, local storage schemas). **Recommendation:** Defer Milestone 3 entirely. Ship the deterministic engine first, measure its accuracy, and add user overrides in a subsequent phase only if data proves insufficient.
