---
name: normalize
description: Normalize a page, route, or feature to match the established design system and product UX patterns, including typography, spacing, color tokens, component usage, interaction behavior, accessibility, and responsive conventions. Use when UI is inconsistent, one-off styles appear, or a feature needs full alignment with design-system standards. Avoid when the goal is a bold style-direction shift beyond current system patterns.
---

# Normalize

## Goal

Analyze and redesign a feature to match design-system standards, aesthetics, and established UX patterns with production-quality consistency.

## Input

- `feature` (optional): page, route, component set, or feature to normalize.
- If `feature` is omitted, normalize the most relevant surface in the current request.

## Plan

Before making changes, build full context.

### 1) Discover the Design System

Search for internal design-system documentation and source patterns.

- Use targeted search terms such as:
  - `design system`
  - `ui guide`
  - `style guide`
  - `design tokens`
  - `component library`
- Study:
  - core design principles and visual direction
  - audience/persona considerations
  - component conventions and interaction patterns
  - token systems (color, typography, spacing, radius, elevation, motion)

If design-system guidance is ambiguous, ask for clarification instead of guessing.

### 2) Analyze the Current Feature

Assess where and how the target diverges.

- Identify deviations from known design patterns.
- Separate cosmetic inconsistency from functional/UX inconsistency.
- Identify root causes:
  - missing token usage
  - one-off component implementations
  - pattern misalignment in user flows

### 3) Create a Normalization Plan

Define exact changes before implementation.

- Replace custom components with system equivalents where available.
- Replace hard-coded visual values with design tokens.
- Align user flows and interaction patterns with established product behavior.

Prioritize usability and UX consistency over cosmetic polish alone.

## Execute

Systematically normalize across all dimensions below.

### Typography

- Use system-defined font families, sizes, line heights, and weights.
- Replace hard-coded type values with typography tokens/classes.
- Align heading/body/caption scale and hierarchy with system standards.

### Color and Theme

- Use design-system color tokens and semantic roles.
- Remove one-off colors that bypass the palette.
- Preserve contrast and theme parity (light/dark/high-contrast as applicable).

### Spacing and Layout

- Use spacing tokens for margin, padding, and gap.
- Align to established grid/layout primitives.
- Remove arbitrary spacing values that break rhythm.

### Components

- Replace custom or duplicated UI with canonical design-system components.
- Match approved variants, prop usage, and states.
- Keep behavior and visual output consistent with existing patterns.

### Motion and Interaction

- Align transition timing, easing, and interaction feedback with system motion rules.
- Ensure hover/focus/active/disabled states follow existing conventions.

### Responsive Behavior

- Apply standard breakpoints and responsive layout behavior.
- Ensure component adaptations match known mobile/tablet/desktop patterns.

### Accessibility

- Preserve or improve contrast, focus visibility, keyboard flow, and semantics.
- Ensure ARIA and interactive semantics match design-system accessibility expectations.

### Progressive Disclosure

- Match information hierarchy and complexity management patterns used elsewhere.
- Avoid overloading views when system patterns progressively reveal detail.

Apply judgment beyond this list to capture all meaningful inconsistencies.

## Clean Up

After normalization, leave the codebase cleaner than before.

- Consolidate reusable components into shared/design-system paths when appropriate.
- Remove obsolete files, styles, and dead code replaced by normalization.
- Eliminate duplication introduced during refactoring.
- Run repository quality checks (lint, typecheck, tests) and verify no regressions.

## Non-Negotiables

- Do not create one-off components when equivalent design-system components exist.
- Do not hard-code values that should be tokenized.
- Do not introduce new interaction/visual patterns that diverge from the system.
- Do not reduce accessibility in the name of consistency.
