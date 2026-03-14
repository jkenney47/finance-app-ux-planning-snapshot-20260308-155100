---
name: animate
description: Enhance interface quality with purposeful animations, micro-interactions, and motion transitions that improve feedback, comprehension, and delight while preserving accessibility and performance. Use when a feature feels static, abrupt, or unclear and motion can improve the experience. Avoid when the core issue is content structure or flow complexity rather than motion.
---

# Animate

## Goal

Strategically add motion that improves understanding, feedback, and product feel without causing distraction or performance regressions.

## Input

- `target` (optional): feature, page, route, or component to animate.
- If `target` is omitted, animate the most relevant surface from the request.

## Mandatory Preparation

### 1) Gather Context First

Collect required context from thread and codebase:

- target audience and personas (critical)
- intended use-cases (critical)
- brand personality (playful/serious, energetic/calm)
- performance constraints (device class, complexity, network)

If exact data is missing and inference is required:

- state inferred assumptions
- ask the user to confirm before proceeding

If confidence is medium or lower:

- ask clarifying questions first
- wait for answers before implementation

Do not proceed on guesswork.

### 2) Use `$frontend-design` Before Proceeding

- Run `$frontend-design` for motion principles and anti-pattern guardrails.
- Review all `DO` and `DON'T` guidance before adding animation.
- If `$frontend-design` is unavailable, continue using this skill's built-in guardrails and explicitly note the limitation.

## Assess Animation Opportunities

Identify where motion adds value.

### Static Friction Areas

- actions with weak/no feedback
- abrupt state/route transitions
- unclear spatial/hierarchical relationships
- opportunities for guidance and focus
- moments lacking personality where appropriate

### Context Fit

- brand personality and motion tone
- performance budget and target devices
- user expectations (including speed-oriented users)
- accessibility needs and motion sensitivity
- whether one hero animation or distributed micro-interactions is better

Always respect `prefers-reduced-motion`.

## Plan Animation Strategy

Define a layered plan:

- hero moment: one signature animation
- feedback layer: interaction acknowledgment
- transition layer: smooth state changes
- delight layer: selective personality moments

Prefer one coherent motion system over scattered effects.

## Implement Animations

### Entrance Animations

- orchestrated page load reveals with controlled stagger timing
- hero entrances for primary content
- scroll-based reveals where narrative clarity benefits
- smooth modal/drawer entry with proper focus management

### Micro-Interactions

- button hover/press/loading feedback
- input focus/validation transitions
- toggles, checkboxes, and state controls with smooth state change
- targeted interactions like favorite/copy confirmations

### State Transitions

- fade/slide for show-hide transitions
- expand-collapse with managed height overflow behavior
- loading/success/error transitions that preserve continuity
- enable-disable transitions with clear affordance changes

### Navigation and Flow

- route transitions appropriate to information continuity
- tab switching indicators and content transitions
- carousel/slider transform-based motion
- scroll-linked behavior that aids orientation

### Feedback and Guidance

- contextual hover hints/tooltips
- drag-and-drop lift/drop affordances
- workflow focus guidance through motion emphasis

### Delight Moments

- subtle empty-state liveliness
- completion celebrations where context supports it
- optional easter-egg patterns only when brand-appropriate

## Technical Implementation

### Timing and Easing

- 100-150ms: immediate feedback
- 200-300ms: common state transitions
- 300-500ms: layout and modal transitions
- 500-800ms: larger entrances only when justified

Use natural deceleration curves (quart/quint/expo out).  
Avoid bounce/elastic easing.

Exit animations should be faster than entrance animations (about 75% of enter duration).

### Animation Techniques

- Prefer `transform` and `opacity` for GPU-friendly motion.
- Use CSS transitions/keyframes for declarative state changes.
- Use JS animation tooling only for complex interactive sequences.
- Use `will-change` sparingly and intentionally.

### Accessibility

Implement reduced motion behavior:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Non-Negotiables

- Do not use bounce or elastic easing.
- Do not animate layout properties (`width`, `height`, `top`, `left`) when transform alternatives exist.
- Do not use long feedback durations that feel laggy.
- Do not animate without purpose.
- Do not ignore `prefers-reduced-motion`.
- Do not animate every surface (avoid animation fatigue).
- Do not block interaction unless intentionally required.

## Verify Quality

Validate motion on target contexts:

- smooth at 60fps on representative devices
- natural timing/easing, not robotic or distracting
- reduced-motion mode works correctly
- interaction remains responsive during and after transitions
- animation clearly improves comprehension or delight

Great motion should feel like the interface naturally behaves correctly, not like an effect showcase.
