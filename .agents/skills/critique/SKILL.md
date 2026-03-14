---
name: critique
description: Evaluate interface effectiveness from a UX and design-direction perspective, including visual hierarchy, information architecture, emotional resonance, discoverability, composition, typography, color intent, states, and microcopy. Use when asked to critique a screen, flow, or feature and provide direct, prioritized, actionable feedback without implementing fixes. Avoid when the request is to implement changes immediately.
---

# Critique

## Goal

Deliver a holistic design critique that evaluates whether the interface works as a designed experience, not only as technical UI implementation.

## Input

- `area` (optional): feature, flow, screen, component, or route to critique.
- If `area` is omitted, critique the most relevant interface surface from the request.

## Required First Step

1. Use `$frontend-design` first for principles and anti-pattern checks.
2. Review all anti-pattern `DON'T` guidelines from `$frontend-design` before final judgment.
3. If `$frontend-design` is unavailable, continue using this skill's built-in guardrails and note that limitation explicitly.

## Critique Workflow

### 1) AI Slop Detection (Critical)

Treat this as the highest-priority check.

- Determine whether the interface looks like generic AI-generated output from 2024-2025.
- Compare against all `$frontend-design` anti-pattern `DON'T` rules.
- Look for known tells: AI-like color palette, gradient text, dark mode with glow accents, glassmorphism, hero metrics, identical card grids, generic font usage, and related fingerprints.
- Apply the direct test: if someone heard "AI made this," would they instantly believe it?

### 2) Visual Hierarchy

- Verify the eye path reaches the most important element first.
- Verify a clear primary action is discoverable within two seconds.
- Verify size, color, and position correctly encode importance.
- Flag visual competition between elements with different intended weights.

### 3) Information Architecture

- Verify structure is intuitive to new users.
- Verify related content is grouped logically.
- Flag cognitive overload from excessive simultaneous choices.
- Verify navigation is predictable and clear.

### 4) Emotional Resonance

- Identify the emotion the interface evokes and whether it is intentional.
- Verify alignment with brand personality and product promise.
- Evaluate trust, approachability, premium/playful tone, or target emotional outcome.
- Assess whether target users would feel "this is for me."

### 5) Discoverability and Affordance

- Verify interactive elements clearly look interactive.
- Verify users can infer what to do without extra instruction.
- Evaluate usefulness of hover/focus/active feedback states.
- Flag hidden features that should be surfaced.

### 6) Composition and Balance

- Evaluate balance versus uncomfortable visual weighting.
- Evaluate whitespace as intentional composition rather than leftover spacing.
- Evaluate rhythm in spacing, repetition, and alignment.
- Distinguish intentional asymmetry from accidental imbalance.

### 7) Typography as Communication

- Evaluate readability and hierarchy (what users read first, second, third).
- Check body text comfort (line length, size, spacing).
- Evaluate font choice fit for brand and tone.
- Verify heading levels have meaningful contrast.

### 8) Color with Purpose

- Evaluate whether color communicates meaning, not decoration only.
- Evaluate palette cohesion.
- Verify accents direct attention to the right actions and content.
- Evaluate color-blind robustness beyond raw technical compliance.

### 9) States and Edge Cases

- Empty states: verify they guide users to action.
- Loading states: verify they reduce perceived waiting cost.
- Error states: verify they are helpful and non-blaming.
- Success states: verify they confirm outcomes and guide the next step.

### 10) Microcopy and Voice

- Evaluate clarity and concision of language.
- Evaluate whether tone sounds human and brand-appropriate.
- Verify labels and button copy are unambiguous.
- Verify error copy helps users recover.

## Output Format

Generate the critique report in this order.

### Anti-Patterns Verdict

Start here. Give pass/fail on whether the interface looks AI-generated. List concrete tells from anti-pattern rules. Be direct.

### Overall Impression

Provide brief gut reaction: what works, what does not, and the single biggest opportunity.

### What Is Working

Highlight 2-3 specific strengths and explain why they succeed.

### Priority Issues

List the top 3-5 design problems in strict priority order. For each issue include:

- `What`: clear problem statement.
- `Why it matters`: user and business impact.
- `Fix`: concrete recommended change.
- `Command`: best follow-up command (`/polish`, `/simplify`, `/bolder`, `/quieter`, etc.).

### Minor Observations

Capture smaller but worthwhile improvements as concise notes.

### Questions to Consider

Provide provocative, decision-shaping questions that can unlock stronger design directions.

Examples:

- "What if the primary action were more prominent?"
- "Does this need to feel this complex?"
- "What would a more confident version of this look like?"

## Critique Standards

- Be direct; avoid vague feedback.
- Be specific about location and element.
- Explain what is wrong and why it matters to users.
- Give concrete recommendations, not generic exploration advice.
- Prioritize ruthlessly; do not flatten all issues to equal importance.
- Do not soften critical feedback when quality is below bar.
