---
name: quieter
description: Tone down visually aggressive interfaces into refined, approachable, and sophisticated designs while preserving clarity, personality, and effectiveness. Use when a page, route, or component feels overstimulating, too loud, or visually heavy and needs calmer execution without becoming generic. Avoid when the experience feels too flat or timid and needs stronger emphasis.
---

# Quieter

## Goal

Reduce visual intensity in overly bold designs while maintaining impact, usability, and distinctive brand character.

## Input

- `target` (optional): page, route, feature, or component to quiet down.
- If `target` is omitted, refine the most relevant interface surface from the request.

## Mandatory Preparation

### 1) Gather Context First

Collect essential context from thread and codebase before making design changes:

- target audience and personas (critical)
- core use-cases and task intent (critical)
- brand personality and tone
- product constraints and non-negotiables

If exact information is missing and you must infer:

- explicitly state the inference
- ask user confirmation before proceeding

If confidence is medium or lower:

- ask clarifying questions first
- wait for answers before continuing

Do not proceed on guesswork.

### 2) Use `$frontend-design` Before Proceeding

- Run `$frontend-design` for principles and anti-pattern guardrails.
- Review all `DO` and `DON'T` guidance before execution.
- If `$frontend-design` is unavailable, continue using this skill's built-in guardrails and explicitly note the limitation.

## Assess Current State

Identify what drives excessive intensity.

### Intensity Sources

- over-saturated or overly bright colors
- harsh contrast everywhere
- too many heavy/bold elements competing
- animation overload or dramatic motion
- decorative complexity and clutter
- oversized scale with weak hierarchy

### Context Understanding

- feature purpose (marketing, utility, reading, workflow tool)
- target audience expectations
- existing strengths worth preserving
- core message and primary action clarity

If context remains unclear, ask clarification before changing design.

Quieter means refined, not dull.

## Plan Refinement

Define strategy before implementation.

- color strategy: desaturate, rebalance, or shift toward sophisticated tones
- hierarchy strategy: choose few elements that stay emphatic, let others recede
- simplification strategy: identify what to remove entirely
- sophistication strategy: increase quality through restraint and precision

Subtlety requires more precision than loudness.

## Refine the Design

### Color Refinement

- Reduce saturation to calmer but still intentional values.
- Replace bright palette choices with nuanced tones.
- Reduce color count; use accents deliberately (for example ~10% accent usage).
- Let neutrals carry more layout structure.
- Reserve high contrast for critical actions/legibility moments.
- Use tinted grays (warm/cool) rather than lifeless pure gray.
- Avoid gray text on colored backgrounds.

### Visual Weight Reduction

- Lower type weights where over-boldness harms readability.
- Reduce exaggerated type scales where unnecessary.
- Maintain hierarchy through spacing, rhythm, and selective emphasis.
- Increase breathing room and reduce density.
- Soften or remove heavy borders and dividers.

### Simplification

- Remove decorative effects that do not support task clarity.
- Reduce unnecessary gradients, patterns, glow, blur, and stacked shadows.
- Simplify exaggerated shapes and edge treatments.
- Flatten unnecessary visual layers while preserving hierarchy.

### Motion Reduction

- Shorten animation travel distance and intensity.
- Keep functional motion, remove decorative flourishes.
- Use gentle micro-interactions for feedback.
- Use refined easing (quart/quint out); avoid bounce/elastic.
- Remove motion that lacks clear purpose.

### Composition Refinement

- Reduce extreme scale jumps while keeping clear hierarchy.
- Bring outlier elements back into structured grid alignment.
- Normalize spacing rhythm for calm, consistent flow.

## Non-Negotiables

- Do not flatten hierarchy into sameness.
- Do not remove all color/personality.
- Do not make everything small/light.
- Do not reduce affordance clarity or task completion quality.
- Do not trade usability for aesthetic restraint.

## Verify Quality

Confirm the quieter version is better, not bland:

- still functional: task flow remains clear and efficient
- still distinctive: character remains, not generic template output
- better reading comfort: less visual fatigue over longer sessions
- increased sophistication: calmer, more premium, more intentional feel

Quiet design should feel confident, not timid.
