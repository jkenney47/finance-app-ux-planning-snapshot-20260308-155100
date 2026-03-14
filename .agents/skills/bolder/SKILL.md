---
name: bolder
description: Amplify safe or visually underwhelming interfaces into distinctive, memorable, high-impact designs while preserving usability, accessibility, and product purpose. Use when a page, route, or component feels generic, timid, or low-energy and needs intentional visual confidence. Avoid when the interface is already visually intense and needs restraint instead.
---

# Bolder

## Goal

Increase visual impact and personality in designs that feel too safe or generic, without creating chaos or sacrificing usability.

## Input

- `target` (optional): page, route, feature, or component to amplify.
- If `target` is omitted, use the most relevant interface surface from the request.

## Mandatory Preparation

### 1) Gather Context First

Before design changes, collect essential context from the thread and codebase:

- target audience and personas (critical)
- core user use-cases (critical)
- brand personality and tone
- product constraints (brand, compliance, accessibility, performance)

If exact information is missing and you must infer:

- state your inference clearly
- ask the user to confirm before proceeding

If confidence is medium or lower:

- ask clarifying questions first
- do not proceed until you have answers

Guessing leads to generic output.

### 2) Use `$frontend-design` Before Proceeding

- Run `$frontend-design` for principles and anti-patterns.
- Review all `DO` and `DON'T` guidance before making decisions.
- If `$frontend-design` is unavailable, continue using this skill's built-in guardrails and explicitly note the limitation.

## Assess Current State

Identify what currently makes the design feel safe or boring.

### Weakness Sources

- generic defaults (font, color, layout)
- timid scale (everything medium)
- low contrast in hierarchy/attention
- static presentation (no motion energy)
- predictable composition
- flat hierarchy (no strong focal point)

### Context Constraints

- brand personality and allowed expression range
- feature purpose (marketing surfaces can be bolder than operational dashboards)
- audience expectations
- accessibility/performance and implementation constraints

If these remain unclear, ask clarifying questions before proceeding.

Bold means distinctive and intentional, not noisy or chaotic.

## AI Slop Guardrail

Do not use generic "AI bold" tropes:

- cyan/purple default gradients
- glassmorphism defaults
- neon accents on dark backgrounds
- gradient metric cards
- trend-copy without brand fit

Review all `$frontend-design` anti-pattern `DON'T` rules before implementation.

## Plan Amplification

Define strategy before touching implementation.

- Focal point: pick one hero moment.
- Personality direction: choose one lane (for example elegant drama, playful energy, moody contrast).
- Risk budget: decide how far experimentation can go inside constraints.
- Hierarchy amplification: increase contrast between primary and secondary elements.

Impact without function is decoration, not design quality.

## Amplify the Design

### Typography Amplification

- Replace generic system choices with deliberate, brand-fit typography.
- Increase scale contrast substantially (not tiny step changes).
- Increase weight contrast where it improves hierarchy.
- Use display/variable/condensed/extended styles intentionally, not as novelty.

### Color Intensification

- Increase color confidence while avoiding neon slop.
- Build a deliberate palette with one dominant color strategy.
- Use sharp accents intentionally for attention control.
- Use tinted neutrals instead of lifeless pure grays when appropriate.
- Use purposeful, non-generic gradients only when they support the concept.

### Spatial Drama

- Increase scale contrast for key elements.
- Allow hero content to break strict container monotony where appropriate.
- Use asymmetry and tension intentionally.
- Use whitespace as a dramatic tool, not leftover space.
- Layer/overlap selectively to add depth and focus.

### Visual Effects

- Use depth (shadows/textures/patterns) intentionally and sparingly.
- Avoid generic rounded-card shadow stacks.
- Avoid glassmorphism defaults.
- Use decorative frames, custom motifs, or brand-relevant visual accents.

### Motion and Animation

- Add purposeful entrance choreography with staggered timing.
- Use scroll/reveal motion only when it supports narrative and clarity.
- Use responsive micro-interactions for feedback.
- Use natural easing (quart/quint/expo out), avoid bounce/elastic.
- Keep animations performant and avoid fatigue.

### Composition Boldness

- Create a strong hero focal point.
- Introduce directional flow beyond rigid axis layouts when helpful.
- Use full-bleed sections where impact matters.
- Explore stronger proportional splits (for example 70/30, 80/20) if they improve hierarchy.

## Non-Negotiables

- Do not add effects without purpose.
- Do not reduce readability for aesthetics.
- Do not make everything bold at once.
- Do not violate WCAG accessibility requirements.
- Do not overwhelm with motion.
- Do not copy trends blindly.

## Verify Quality

Validate boldness without sacrificing utility:

- not AI slop: avoid generic trend fingerprints
- still functional: tasks remain clear and efficient
- coherent: visual language feels intentional and unified
- memorable: clear identity and recall
- performant: smooth rendering/animation
- accessible: contrast, focus, motion preferences, keyboard/screen reader support remain sound

If the output still looks like generic AI-generated "bold," rework from strategy level.
