---
name: colorize
description: Introduce strategic color into overly monochromatic interfaces to improve hierarchy, meaning, warmth, and engagement while preserving accessibility and brand coherence. Use when a feature feels gray, flat, or visually cold and needs purposeful color application without becoming noisy. Avoid when the primary issue is structural IA complexity rather than color intent.
---

# Colorize

## Goal

Add purposeful color to designs that are too monochromatic or timid, improving usability and personality through controlled, meaningful color use.

## Input

- `target` (optional): feature, page, route, or component to colorize.
- If `target` is omitted, colorize the most relevant interface surface from the request.

## Mandatory Preparation

### 1) Gather Context First

Collect required context from thread and codebase:

- target audience and personas (critical)
- intended use-cases (critical)
- brand personality/tone
- existing brand colors and token constraints (critical)

If exact context is missing and inference is required:

- state inferred assumptions explicitly
- ask user confirmation before proceeding

If confidence is medium or lower:

- ask clarifying questions first
- wait for answers before implementation

Do not proceed on color guesswork.

### 2) Use `$frontend-design` Before Proceeding

- Run `$frontend-design` for principles and anti-pattern guardrails.
- Review all `DO` and `DON'T` guidance before introducing color.
- If `$frontend-design` is unavailable, continue using this skill's built-in guardrails and explicitly note the limitation.

## Assess Color Opportunity

Identify where color creates value.

### Current-State Review

- absence of meaningful color (grayscale or timid accents)
- missed hierarchy opportunities
- domain/context appropriateness
- available brand palette alignment

### Where Color Helps

- semantic meaning (success/error/warning/info)
- hierarchy and attention control
- categorization and wayfinding
- emotional tone and warmth
- personality/delight moments

If these factors are unclear, ask clarification before implementing.

Strategic color beats high-volume color.

## Plan Color Strategy

Define a restrained, intentional palette plan:

- palette scope: 2-4 colors beyond neutrals
- dominant/supporting/accent distribution (for example 60/30/10)
- semantic mapping: fixed meaning per color
- application map: where each color appears and why

## Introduce Color Strategically

### Semantic Color

- define consistent success/error/warning/info mappings
- apply color to state badges, indicators, and progress patterns
- preserve neutral states for inactive/secondary UI

### Accent Application

- primary actions and key CTAs
- links and interactive text cues
- key icons and section labels
- active/hover/focus states where needed

### Background and Surface Color

- replace lifeless neutral grays with subtle warm/cool tinted neutrals
- use gentle section tints for grouping
- apply gradients only when intentional and non-generic
- keep surfaces readable and calm

Prefer perceptually uniform color systems (for example OKLCH) for reliable scaling.

### Data Visualization

- use color to encode categories and status clearly
- keep palette consistency across charts and comparative views
- ensure distinctions remain readable for color-deficient users

### Borders and Structural Accents

- apply subtle accent borders/dividers/focus rings to aid hierarchy
- avoid random decorative lines

### Typography Color

- color headings/labels intentionally, not indiscriminately
- preserve text contrast and readability requirements
- avoid gray text on colored backgrounds

### Decorative Color Elements

- use illustrations, shapes, gradients, or motifs sparingly
- ensure decorative color reinforces brand and structure

## Balance and Refinement

### Maintain Hierarchy

- dominant color handles most colored emphasis
- secondary color supports, accent color highlights rare focal moments
- neutrals continue to structure layout

### Accessibility

- meet WCAG contrast ratios (4.5:1 text, 3:1 UI components minimum)
- never rely on color alone for state meaning
- validate color-blind readability for critical paths

### Cohesion

- use a consistent palette and semantic mapping
- maintain temperature coherence (warm vs cool bias)
- avoid arbitrary one-off color injections

## Non-Negotiables

- Do not use rainbow palettes without structure.
- Do not apply color without purpose.
- Do not use gray text on colored backgrounds.
- Do not use pure black/white as dominant large-area neutrals.
- Do not violate WCAG contrast.
- Do not use color as the only status indicator.
- Do not over-color every element.
- Do not default to generic purple-blue gradient aesthetics.

## Verify Color Addition

Validate that colorization improved outcomes:

- clearer hierarchy and attention guidance
- stronger semantic understanding of states/categories
- warmer and more engaging overall feel
- preserved accessibility and readability
- balanced, intentional color distribution without overwhelm

Use color as a communication system, not decoration volume.
