---
name: frontend-design
description: Provide repo-specific UI/UX principles and anti-pattern guardrails for Finance-App. Use before UI/UX implementation, redesign, critique, audit, or polish work to keep output intentional, consistent, and production-ready.
---

# Frontend Design

## Goal

Set a shared design quality bar for Finance-App so UI/UX work is distinctive, usable, accessible, and consistent with the product.

## When To Use

- before making UI/UX changes
- when another skill asks for design principles or anti-pattern checks
- before final critique, audit, or polish decisions

## Repo Context Baseline

- Stack: Expo + React Native + TypeScript + Expo Router
- Component system: React Native Paper
- Tokens: `theme/tokens.ts`
- Theme bridge: `theme/paper.ts`
- Reusable UI lives in `components/`

Favor consistency with existing product patterns unless the task explicitly asks for a redesign.

## DO

- Use design tokens for spacing, color, type, radius, and elevation decisions.
- Create a clear visual hierarchy with one obvious primary action.
- Use expressive but intentional typography; avoid default generic stacks.
- Use color as meaning and hierarchy, not decoration volume.
- Keep layout rhythm consistent across states and breakpoints.
- Support accessibility: contrast, focus visibility, keyboard flow, reduced motion.
- Design empty/loading/error/success states as first-class experiences.
- Use motion to improve comprehension, feedback, and continuity.
- Verify that interactions stay performant and responsive on real devices.
- Keep copy direct, specific, and action-oriented.

## DON'T

- Do not ship generic AI-looking output (template card grids, trend-copy styling).
- Do not default to purple-on-white or neon dark-mode aesthetics.
- Do not rely on glassmorphism, gradient text, or effect-heavy surfaces by default.
- Do not use gray text on colored backgrounds.
- Do not use bounce/elastic easing for core product interactions.
- Do not animate everything; avoid motion fatigue.
- Do not nest containers/cards without a clear structural reason.
- Do not use hard-coded color values when a token exists.
- Do not hide core actions behind unclear affordances.
- Do not prioritize visual novelty over readability or task completion.

## Quality Checklist

Before implementation or sign-off, verify:

- hierarchy is clear in under two seconds
- primary action is unambiguous
- states and edge cases are covered
- mobile and small-screen behavior is robust
- accessibility requirements are satisfied
- visual language matches the surrounding product

## Output Expectations

When invoked, return:

1. the selected direction in one sentence
2. key constraints and assumptions
3. prioritized design decisions tied to user impact
4. anti-patterns explicitly avoided
