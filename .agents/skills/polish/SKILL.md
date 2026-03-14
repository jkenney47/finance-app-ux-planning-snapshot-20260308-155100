---
name: polish
description: Run a final quality pass before shipping to fix alignment, spacing, interaction-state, copy, responsiveness, accessibility, and detail-level consistency issues. Use when a feature is functionally complete and needs production polish that raises perceived quality from good to great. Avoid for major IA rewrites or direction-level redesign decisions.
---

# Polish

## Goal

Perform a meticulous final pass that catches the small details that separate shipped from polished.

## Input

- `target` (optional): page, route, feature, or component set to polish.
- If `target` is omitted, polish the most relevant surface in the current request.

## Required First Step

1. Use `$frontend-design` for principles and anti-pattern checks.
2. Apply the anti-pattern `DON'T` rules before finalizing polish decisions.
3. If `$frontend-design` is unavailable, proceed using this skill's built-in guardrails and explicitly note the limitation.

## Pre-Polish Assessment

Confirm polish is the right step.

### 1) Review Completeness

- Confirm the feature is functionally complete.
- Identify known issues that should remain documented (use TODO markers when needed).
- Identify quality bar (`MVP`, production, flagship).
- Assess delivery timing to right-size polish depth.

Do not polish unfinished core functionality first.

### 2) Identify Polish Areas

- visual consistency gaps
- spacing/alignment drift
- missing interaction states
- copy inconsistency
- weak edge/error/empty/loading states
- transition smoothness and perceived quality

## Polish Systematically

### Visual Alignment and Spacing

- Enforce grid alignment and spacing scale consistency.
- Correct optical alignment issues where geometry feels off.
- Verify responsive alignment at all supported breakpoints.

### Typography Refinement

- Enforce consistent hierarchy for equivalent elements.
- Keep body readability comfortable (line length, line height, size).
- Resolve widows/orphans where practical in key blocks.
- Prevent font loading flashes and hierarchy drift.

### Color and Contrast

- Use design tokens only; remove one-off color values.
- Verify WCAG contrast and visible focus states.
- Maintain consistent color meaning across contexts.
- Avoid neutral misuse:
  - avoid pure neutral gray/black where tinted neutrals are required
  - avoid gray text on colored backgrounds

### Interaction States

Ensure every interactive control has complete state coverage:

- default
- hover
- focus
- active
- disabled
- loading
- error
- success

Missing states are quality defects.

### Micro-Interactions and Transitions

- Keep transitions smooth and purposeful.
- Use consistent easing and duration ranges (typically 150-300ms).
- Avoid bounce/elastic motion styles.
- Preserve 60fps by animating `transform`/`opacity`.
- Respect `prefers-reduced-motion`.

### Content and Copy

- Normalize terminology and naming consistency.
- Normalize capitalization style and punctuation conventions.
- Fix grammar/spelling and tighten verbose copy.

### Icons and Images

- Ensure icon family/style consistency and context-appropriate sizing.
- Ensure optical alignment between icon and text.
- Ensure descriptive alt text for non-decorative images.
- Prevent layout shift with fixed aspect ratios/sizing.
- Ensure high-DPI asset quality where required.

### Forms and Inputs

- Ensure labels, required indicators, and validation timing are consistent.
- Ensure error copy is clear and recovery-oriented.
- Ensure keyboard tab order and focus behavior are logical.

### Edge Cases and State Quality

- verify loading states for async actions
- verify empty states with clear next actions
- verify error states with recovery paths
- verify success confirmations
- verify long-content and missing-data handling
- verify offline/degraded behavior when applicable

### Responsiveness

- Validate mobile/tablet/desktop behavior.
- Enforce minimum touch-target size (44x44px on touch surfaces).
- Keep mobile text readable (avoid tiny body text).
- Prevent horizontal overflow and broken reflow.

### Performance

- Preserve fast initial render and smooth interaction.
- Prevent avoidable layout shift.
- Ensure media is optimized and off-screen content lazy loads appropriately.

### Code Quality

- Remove debug logs and dead/commented code.
- Remove unused imports and stale helpers.
- Preserve strict typing and avoid `any`.
- Preserve semantic markup and accessibility correctness.

## Polish Checklist

- [ ] Alignment is consistent at all breakpoints
- [ ] Spacing follows tokens/scale consistently
- [ ] Typography hierarchy is consistent
- [ ] All interactive states are implemented
- [ ] Motion is smooth and consistent
- [ ] Copy is clear and consistent
- [ ] Icons/images are consistent and aligned
- [ ] Forms are labeled and validated consistently
- [ ] Error/loading/empty/success states are polished
- [ ] Touch targets are at least 44x44px where required
- [ ] WCAG AA contrast and focus visibility are satisfied
- [ ] Keyboard navigation works end-to-end
- [ ] No console warnings/errors from polished surface
- [ ] No avoidable layout shift on load
- [ ] Reduced-motion preferences are respected
- [ ] Code is clean and production-ready

## Final Verification

Before completion:

- use the feature directly end-to-end
- test on real devices when possible
- run a fresh-eyes review when available
- compare against intended design outcomes
- verify all non-happy states, not only happy path

## Non-Negotiables

- Do not polish before functional completeness.
- Do not introduce bugs while polishing.
- Do not over-polish one area while leaving systemic roughness elsewhere.
- Do not ignore recurring systemic issues in favor of one-off tweaks.
