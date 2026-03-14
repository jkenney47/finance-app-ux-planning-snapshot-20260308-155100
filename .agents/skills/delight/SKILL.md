---
name: delight
description: Add moments of joy, personality, and polished surprise that make interfaces more memorable while preserving usability, accessibility, and task completion. Use when a feature is functionally solid but emotionally flat and can benefit from context-appropriate delight. Avoid when core usability, accessibility, or flow fundamentals are not yet stable.
---

# Delight

## Goal

Introduce thoughtful moments of joy and personality that elevate a functional interface into an enjoyable experience.

## Input

- `target` (optional): feature, page, route, or component to enrich with delight.
- If `target` is omitted, improve the most relevant interface surface from the request.

## Mandatory Preparation

### 1) Gather Context First

Before adding delight, collect essential context from thread and codebase:

- target audience and personas (critical)
- intended use-cases (critical)
- brand personality (playful, professional, quirky, elegant)
- domain appropriateness (for example fintech vs gaming expectations)

If exact information is missing and inference is required:

- state assumptions explicitly
- ask user confirmation before proceeding

If confidence is medium or lower:

- ask clarifying questions first
- wait for answers before implementation

Delight that mismatches context is worse than no delight.

### 2) Use `$frontend-design` Before Proceeding

- Run `$frontend-design` for design principles and anti-pattern guardrails.
- Review all `DO` and `DON'T` guidance before adding delight.
- If `$frontend-design` is unavailable, continue using this skill's built-in guardrails and explicitly note the limitation.

## Assess Delight Opportunities

Identify moments where delight enhances, not distracts.

### Natural Delight Moments

- success completions
- empty/first-time states
- loading/waiting periods
- achievements and milestones
- micro-interaction touch points (hover/click/drag)
- frustration-softening error contexts
- optional discovery/easter-egg surfaces

### Context Fit

- brand personality and audience
- emotional context of each moment
- domain constraints and appropriateness
- strategy type:
  - subtle sophistication
  - playful personality
  - helpful surprise
  - sensory richness

If unclear, ask clarification before implementation.

Delight must support task success.

## Delight Principles

### Delight Amplifies, Never Blocks

- keep delight quick (usually under 1 second)
- do not delay core actions for delight
- make delight subtle/skippable where relevant
- respect user focus and time

### Surprise and Discovery

- reward curiosity with optional details
- avoid over-announcing every delightful element
- allow discoverable moments to feel earned

### Context Appropriateness

- celebrate success, empathize in errors
- avoid playful tone in critical failure moments
- align to brand and culture expectations

### Compounding Over Time

- keep delight from becoming repetitive fatigue
- vary repeated responses where possible
- layer discovery across continued usage

## Delight Techniques

### Micro-Interactions and Motion

- satisfying button press/lift behavior
- expressive but efficient loading treatments
- success confirmation animations
- hover reveals and affordance polish

### Personality in Copy

- warm, human empty states
- empathetic errors with useful recovery
- brand-fit tone in labels/tooltips
- never use tone that undermines trust

### Visual Personality

- custom illustration accents
- expressive icon behavior/styles
- subtle background personality (patterns, gradients, depth)

### Satisfying Interactions

- drag/drop lift/snap polish
- toggles and controls with refined response
- progress celebrations for meaningful milestones
- form feedback that feels reassuring

### Sound Design (When Appropriate)

- subtle, optional cues for key events
- respect system sound settings
- provide mute/off pathways
- avoid repetitive sound fatigue

### Easter Eggs and Hidden Delight

- optional discoverable details
- tasteful seasonal/contextual moments
- developer/advanced-user micro-surprises where appropriate

### Waiting and Celebration Moments

- engaging loading copy/indicators
- milestone celebration patterns
- personalized acknowledgement for meaningful achievements

## Implementation Patterns

- use animation tools appropriate to project stack
- lazy load heavy delight assets
- compress/optimize media
- keep bundle and runtime impact controlled

## Non-Negotiables

- Do not delay core functionality for delight.
- Do not force users through unskippable delight sequences.
- Do not use delight to mask poor UX fundamentals.
- Do not over-animate every interaction.
- Do not sacrifice performance for flair.
- Do not ignore accessibility and reduced-motion needs.
- Do not mismatch tone to domain sensitivity.

## Verify Delight Quality

Validate that delight remains useful:

- users still complete tasks efficiently
- delight remains pleasant after repeated use
- delight can be skipped or toned down
- performance remains smooth
- brand/context appropriateness holds
- reduced-motion and assistive modes remain supported

Great delight adds memorable polish while staying out of the way of the job users came to do.
