---
name: simplify
description: Remove unnecessary complexity from interface design and UX flows to emphasize essential user goals, reduce cognitive load, and improve clarity. Use when a page, route, or feature feels cluttered, overloaded, or over-engineered and needs focused simplification without losing required functionality. Avoid when the issue is mainly visual energy or stylistic tone rather than complexity.
---

# Simplify

## Goal

Strip designs to essential, high-value elements by removing obstacles between users and their primary goal.

## Input

- `target` (optional): page, route, feature, or component to simplify.
- If `target` is omitted, simplify the most relevant surface in the request.

## Mandatory Preparation

### 1) Gather Context First

Before simplifying, collect critical context from thread and codebase:

- target audience and personas (critical)
- primary use-cases (critical)
- what is essential vs optional for this product

If exact details are unavailable and inference is required:

- state the inferred assumptions
- ask user confirmation before proceeding

If confidence is medium or lower:

- ask clarifying questions first
- wait for answers before continuing

Simplifying the wrong elements harms usability.

### 2) Use `$frontend-design` Before Proceeding

- Run `$frontend-design` for design principles and anti-pattern checks.
- Review all `DO` and `DON'T` guidance before simplification decisions.
- If `$frontend-design` is unavailable, continue using this skill's built-in guardrails and explicitly note the limitation.

## Assess Current State

Identify what is driving complexity.

### Complexity Sources

- too many competing elements/actions
- excessive style variation without purpose
- information overload (everything visible at once)
- visual noise (decorative effects without function)
- unclear hierarchy
- feature creep and option overload

### Find the Essence

- identify the single primary user goal
- separate necessary vs nice-to-have
- find what can be removed, deferred, or merged
- identify the high-value 20% driving most user outcomes

If this remains unclear, ask for clarification before simplification.

Every element must justify its existence.

## Plan Simplification

Define a ruthless editing strategy:

- core purpose: one primary outcome
- essential elements: minimum needed for success
- progressive disclosure: what stays hidden until needed
- consolidation: what can be merged into fewer, clearer flows

Saying no to good ideas is necessary for excellent execution.

## Simplify the Design

### Information Architecture

- remove secondary actions and redundant information from primary surfaces
- implement progressive disclosure for advanced/rare paths
- merge related actions and content groups
- enforce one clear primary action and restrained secondary actions
- remove repetition across nearby UI

### Visual Simplification

- reduce palette complexity (few semantic colors + neutrals)
- limit typography scale/weight variants
- remove decorative borders/shadows/backgrounds without functional value
- flatten unnecessary nesting (avoid card-inside-card patterns)
- remove unnecessary card wrappers where spacing/layout is sufficient
- enforce consistent spacing scale

### Layout Simplification

- prefer simple linear flow where it improves comprehension
- remove unnecessary sidebars and dense split layouts
- use generous, intentional whitespace
- enforce consistent alignment strategy

### Interaction Simplification

- reduce decision points and competing CTAs
- use smart defaults for common choices
- prefer inline edits when modal flow is unnecessary
- remove avoidable steps in critical flows
- keep one obvious next step visible

### Content Simplification

- shorten copy while preserving clarity
- use active voice and plain language
- remove jargon and hedging
- structure for scanning (short sections, clear labels)
- remove duplicate explanations and marketing filler in task flows

### Code Simplification

- remove dead/unused code and styles
- reduce deep component nesting
- consolidate duplicated style patterns
- reduce excessive variant counts where a smaller set covers most use-cases

## Non-Negotiables

- Do not remove required functionality.
- Do not reduce accessibility for visual simplicity.
- Do not make interfaces ambiguous in the name of minimalism.
- Do not remove decision-critical information users need.
- Do not flatten hierarchy completely.
- Do not oversimplify genuinely complex domains beyond safe user understanding.

## Verify Simplification

Confirm simplification improved outcomes:

- faster task completion
- lower cognitive load
- required features still accessible
- clearer visual/action hierarchy
- improved performance where complexity was removed

## Document Removed Complexity

When features/options are removed or deferred:

- document what changed and why
- note alternative access paths if required
- note user feedback signals to monitor post-change

Simplicity is deliberate editing: keep what matters, remove what does not.
