# UI/UX Review - 2026-02-26

## Scope

- Core user routes: auth, onboarding, dashboard home/journey/accounts/goals/insights/profile, plaid-link.
- Operations routes: policy-ops, agent-hub.
- Shared UI primitives: `components/common/*`, `components/state/*`, `components/dashboard/*`.

## Method + Limitation

- Skills applied: `critique`, `audit`, `clarify`, `normalize`, `harden`, `polish`.
- Limitation: `$frontend-design` was referenced by skill docs but is not available in this repo. Findings were evaluated against existing product tokens and shared component patterns.

## Anti-Patterns Verdict

- Verdict: pass.
- The UI avoids common generic AI tropes (purple gradients, glassmorphism overload, noisy hero-card spam).
- Main quality gap was clarity and interaction resilience, not visual-direction drift.

## Executive Summary

- Critical: 0
- High: 2
- Medium: 3
- Low: 2

Top issues:

1. Segmented control touch targets were below the 44px accessibility minimum.
2. Recommendation and agent-hub copy used technical phrasing that increases cognitive load for non-technical users.
3. Shared state components used generic labels ("ERROR", "EMPTY STATE") with weaker guidance tone.

## Findings

### High

- Location: `components/common/SegmentedControl.tsx`
- Category: Accessibility
- Impact: Smaller tap targets reduce usability on mobile and create avoidable miss-taps.
- Recommendation: Enforce 44px minimum target and keep each option accessible by label.

- Location: `components/dashboard/NextStepCard.tsx`, `app/(dashboard)/agent-hub.tsx`
- Category: Clarity
- Impact: Technical language lowers trust and action confidence for target users.
- Recommendation: Rewrite labels and messages in plain language while preserving exact behavior.

### Medium

- Location: `components/state/ErrorNotice.tsx`, `components/state/EmptyHint.tsx`
- Category: UX consistency
- Impact: Generic uppercase labels communicate state mechanically rather than actionably.
- Recommendation: Use outcome-oriented labels tied to user action.

- Location: `components/common/Screen.tsx`
- Category: Interaction hardening
- Impact: Form taps can be swallowed by keyboard behavior in scroll contexts.
- Recommendation: Use `keyboardShouldPersistTaps=\"handled\"`.

- Location: `app/(dashboard)/index.tsx`
- Category: Trust copy
- Impact: Hard-coded fake personalization ("Alex") can reduce trust.
- Recommendation: Use neutral greeting unless real profile data is available.

### Low

- Location: `app/(dashboard)/agent-hub.tsx`
- Category: Microcopy
- Impact: Some labels were internal/engineering oriented.
- Recommendation: Rename result sections and action labels to task-oriented language.

- Location: shared loading/error strings across dashboard surfaces
- Category: Tone consistency
- Impact: Mixed styles across screens.
- Recommendation: Continue standardizing copy in subsequent pass.

## Fix Set A (Implemented)

- `components/common/SegmentedControl.tsx`
  - Added `minHeight: 44`, `accessibilityLabel`, and slight hit slop.
- `components/common/Screen.tsx`
  - Added `keyboardShouldPersistTaps=\"handled\"` for form reliability.
- `components/dashboard/NextStepCard.tsx`
  - Rewrote section labels and helper copy to plain-language next-step framing.
- `components/state/ErrorNotice.tsx`
  - Improved default title/action label and made state label action-oriented.
- `components/state/EmptyHint.tsx`
  - Updated state eyebrow to action-oriented phrasing.
- `app/(dashboard)/agent-hub.tsx`
  - Replaced technical copy and error/CTA strings with user-focused language.
- `app/(dashboard)/index.tsx`
  - Removed hard-coded name from dashboard greeting.
- Added tests:
  - `__tests__/components/SegmentedControl.test.tsx`
  - Updated `__tests__/components/NextStepCard.test.tsx`

## Backlog (Next Pass)

- Standardize loading and retry copy across all dashboard tab screens. (`DONE` on 2026-02-26)
- Add focused Maestro coverage for ops surfaces (`agent-hub`, `policy-ops`) and profile/goals/insights state variants. (`DONE` on 2026-02-26)
- Add explicit accessibility labels/hints to remaining custom touch targets not covered by Paper defaults. (`DONE` on 2026-02-26)
