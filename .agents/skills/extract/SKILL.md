---
name: extract
description: Identify repeated UI patterns, hard-coded styling values, and inconsistent component variants, then extract them into reusable components and design tokens for systematic reuse. Use when a feature area has duplication, one-off implementations, or emerging patterns that should be consolidated into a design system.
---

# Extract

## Goal

Extract and consolidate reusable components, tokens, and interaction/layout patterns into the design system to improve consistency and maintainability.

## Input

- `target` (optional): feature, route, component set, or directory to extract from.
- If `target` is omitted, extract from the most relevant surface in the request.

## Discover

### 1) Locate the Design System

Find the existing shared UI/design-system location and conventions:

- component organization and naming
- token architecture and naming
- docs/story patterns
- import/export conventions

If no design system exists, ask before creating one and confirm preferred location/structure.

### 2) Identify Extraction Candidates

Look for:

- repeated component patterns
- hard-coded colors/spacing/type/shadows that should be tokens
- inconsistent implementations of same concept
- reusable layout/composition/interaction patterns

### 3) Assess Extraction Value

Extract only when value is clear:

- current or likely repeated usage (for example 3+ uses)
- measurable consistency gains
- generalizable pattern, not context-specific one-off
- maintenance benefit outweighs abstraction cost

## Plan Extraction

Define a concrete extraction plan:

- components to extract
- tokens to define
- variants needed per component
- naming and API conventions aligned to existing system
- migration steps from local implementations to shared versions

Design-system growth should be incremental and practical.

## Extract and Enrich

### Components

Create reusable components with:

- explicit, typed props and sensible defaults
- focused variants for real use-cases
- built-in accessibility (ARIA, focus, keyboard behavior as relevant)
- usage examples and concise docs

### Design Tokens

Create tokens with:

- clear semantic naming (and primitive layers where appropriate)
- coherent hierarchy and grouping
- usage guidance on when each token should be used

### Patterns

Document reusable patterns with:

- when to use
- code examples
- supported variations/compositions

## Non-Negotiables

- Do not extract one-off context-specific code without generalization.
- Do not create hyper-generic components with weak practical value.
- Do not ignore existing design-system conventions.
- Do not skip proper TypeScript typing and prop documentation.
- Do not tokenize every literal value without semantic meaning.

## Migrate

### 1) Find All Uses

Search for instances of extracted patterns and values.

### 2) Replace Systematically

Refactor consumers to use shared components/tokens.

### 3) Validate Parity

Ensure visual and behavioral parity through checks/tests.

### 4) Delete Dead Code

Remove obsolete local implementations after migration.

## Document

Update system documentation:

- add component docs/usage examples
- document token definitions and intended usage
- update Storybook/component catalog entries when present

Design systems are living systems: extract when patterns prove themselves and maintain consistency over time.
