---
name: audit
description: Perform comprehensive interface quality audits across accessibility, performance, theming, responsive behavior, and design anti-patterns. Use when asked to review a screen, feature, flow, or component and produce a prioritized report with severity ratings, impact analysis, and actionable recommendations without implementing fixes. Avoid when the user asked for direct implementation instead of findings.
---

# Audit

## Goal

Run systematic quality checks and produce a comprehensive audit report with prioritized findings and clear follow-up actions. Do not fix issues in this skill.

## Input

- `area` (optional): feature, flow, screen, component, or route to audit.
- If `area` is omitted, audit the most relevant interface surface from the current request.

## Required First Step

1. Use `$frontend-design` first for design principles and anti-pattern definitions.
2. Apply all `DON'T` guidelines from `$frontend-design` before finalizing findings.
3. If `$frontend-design` is unavailable, continue using this skill's built-in guardrails and explicitly note that limitation in the report.

## Audit Workflow

### 1) Define Scope and Gather Evidence

- Identify audited files/components and runtime surfaces (desktop/mobile).
- Collect concrete evidence from implementation and rendered behavior.
- Verify findings before reporting to avoid false positives.

### 2) Run Diagnostic Scan

Audit every dimension below.

#### Accessibility (A11y)

- Contrast issues: text below 4.5:1 (or 7:1 for AAA).
- Missing ARIA: interactive elements without roles, labels, or states.
- Keyboard navigation: missing focus indicators, illogical tab order, keyboard traps.
- Semantic HTML: improper heading hierarchy, missing landmarks, divs used instead of buttons.
- Alt text: missing or poor image descriptions.
- Form issues: inputs without labels, unclear errors, missing required indicators.

#### Performance

- Layout thrashing: layout reads/writes mixed in loops.
- Expensive animations: animating width/height/top/left instead of transform/opacity.
- Missing optimization: no lazy loading, unoptimized assets, missing `will-change` where needed.
- Bundle size concerns: unnecessary imports, unused dependencies.
- Render performance: unnecessary re-renders, missing memoization.

#### Theming

- Hard-coded colors not using design tokens.
- Broken dark mode variants or poor dark-theme contrast.
- Inconsistent or incorrect token usage.
- Theme switching issues where values do not update.

#### Responsive Design

- Fixed widths that break on smaller viewports.
- Touch targets smaller than 44x44px.
- Horizontal overflow on narrow screens.
- Layout breakage with increased text scaling.
- Missing mobile/tablet breakpoints.

#### Anti-Patterns (Critical)

- Check against all `$frontend-design` anti-pattern `DON'T` rules.
- Flag AI slop tells (AI-like palette, gradient text, glassmorphism, hero metrics, card-grid boilerplate, generic fonts).
- Flag broader anti-patterns (gray-on-color text, nested cards, bounce easing, redundant copy).

### 3) Classify Severity

- `Critical`: blocks core functionality, severe accessibility failure, WCAG A violations.
- `High`: major usability/accessibility risk, WCAG AA violations.
- `Medium`: quality/performance issues, WCAG AAA gaps.
- `Low`: minor inconsistencies and optimization opportunities.

Use user impact, frequency, and blast radius to assign severity.

### 4) Generate Comprehensive Report

Produce the report in this exact order.

#### Anti-Patterns Verdict

Start here. Give a pass/fail verdict on whether the interface looks AI-generated. List specific tells from the anti-pattern checklist.

#### Executive Summary

- Total issues by severity count.
- Top 3-5 most critical issues.
- Overall quality score (if a score is practical).
- Recommended next steps.

#### Detailed Findings by Severity

For every issue, include:

- `Location`: component/file/line or surface.
- `Severity`: Critical/High/Medium/Low.
- `Category`: Accessibility/Performance/Theming/Responsive.
- `Description`: what is wrong.
- `Impact`: why it matters for users.
- `WCAG/Standard`: violated standard when applicable.
- `Recommendation`: concrete fix guidance.
- `Suggested command`: follow-up command (for example `/normalize`, `/optimize`, `/harden`).

Then group findings into:

- `Critical Issues`
- `High-Severity Issues`
- `Medium-Severity Issues`
- `Low-Severity Issues`

#### Patterns and Systemic Issues

Identify recurring patterns with quantified scope when possible.

Examples:

- "Hard-coded colors appear in 15+ components; migrate to design tokens."
- "Touch targets under 44x44 are widespread in mobile actions."
- "Focus indicators are missing across custom interactive controls."

#### Positive Findings

Call out what works well:

- Good practices to retain.
- Exemplary implementations to replicate.

#### Recommendations by Priority

Provide an action plan:

1. Immediate: critical blockers.
2. Short-term: high-severity issues (current sprint).
3. Medium-term: quality improvements (next sprint).
4. Long-term: lower-priority optimizations.

#### Suggested Commands for Fixes

Map issues to follow-up commands, for example:

- "`/normalize` to align with design system (theming consistency issues)."
- "`/optimize` to address performance findings."
- "`/harden` to improve text handling, resilience, and edge cases."

## Non-Negotiables

- Audit only; do not implement fixes.
- Explain user impact for every reported issue.
- Keep severity consistent and defensible.
- Include positive findings.
- Prioritize ruthlessly; avoid noisy low-value issue lists.
- Avoid generic recommendations; stay specific and actionable.
