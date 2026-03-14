---
name: adapt
description: Adapt existing interface designs for new contexts such as mobile, tablet, desktop, print, email, or alternative input/connection constraints while preserving core outcomes and usability. Use when a feature must work consistently across devices, platforms, or usage environments that differ from the original design assumptions.
---

# Adapt

## Goal

Adapt existing designs to work effectively across screen sizes, devices, platforms, and usage contexts with context-appropriate behavior.

## Input

- `target` (optional): page, route, feature, or component to adapt.
- `context` (optional): destination environment (for example mobile, tablet, desktop, print, email).
- If inputs are omitted, infer the most likely target from the request and confirm if ambiguous.

## Assess Adaptation Challenge

Understand what needs adaptation and why.

### 1) Identify Source Context

- What was the current design built for?
- What assumptions exist (screen size, pointer input, network quality)?
- What currently works well and must be preserved?

### 2) Understand Target Context

- device class and form factor
- input method (touch, mouse, keyboard, voice, gamepad)
- screen constraints (size, density, orientation)
- connection constraints (fast, slow, intermittent, offline)
- usage context (quick glance vs focused task)
- platform expectations and native conventions

### 3) Identify Adaptation Challenges

- what does not fit
- what interaction patterns break
- what patterns are context-inappropriate

Adaptation is not simple scaling; reframe the experience for the destination context.

## Plan Adaptation Strategy

Choose a context-specific strategy.

### Mobile (Desktop -> Mobile)

- single-column layouts over dense multi-column layouts
- vertical stacking and full-width component flow
- touch-first controls (44x44px targets minimum)
- progressive disclosure for secondary information
- concise content and stronger prioritization
- mobile-appropriate navigation (bottom nav, drawer, compact header)

### Tablet (Hybrid)

- two-column patterns and master-detail layouts
- orientation-aware adaptations
- support both touch and pointer usage
- balanced density between phone and desktop

### Desktop (Mobile -> Desktop)

- use horizontal space with multi-column composition
- persistent side navigation where useful
- richer information density and simultaneous panels
- hover affordances, keyboard shortcuts, advanced interactions
- constrain max-widths for readability on very large screens

### Print (Screen -> Print)

- remove interactive/navigation chrome
- enforce print-safe pagination and margins
- include metadata (title, date, pagination)
- ensure chart/table variants are print legible

### Email (Web -> Email)

- narrow single-column structure (about 600px max)
- inline CSS and email-safe layout patterns
- strong CTA clarity
- deep-link complex actions back to web/app flows

## Implement Adaptations

Apply changes systematically.

### Responsive and Context Rules

- define meaningful breakpoints (content-driven when possible)
- use grid/flex/container-query patterns for adaptive reflow
- use fluid sizing via `clamp()` where appropriate
- use media queries and conditional visibility with clear rationale

### Touch and Input Adaptation

- ensure touch targets and spacing for touch contexts
- remove hover-only dependencies in touch-first experiences
- add tactile feedback states for taps/presses
- account for thumb reach and ergonomics on phones

### Content Adaptation

- preserve core information and functionality
- adjust disclosure depth per context
- use lazy loading and progressive enhancement where useful
- use responsive media assets (`srcset`, `picture`)

### Navigation Adaptation

- transform complex navigation into context-appropriate patterns
- preserve IA consistency across contexts
- keep orientation and back-navigation predictable

Do not hide critical functionality; make it workable in-context.

## Non-Negotiables

- Do not remove core functionality just to fit small screens.
- Do not break platform conventions for primary interactions.
- Do not diverge information architecture across contexts without clear reason.
- Do not rely on generic breakpoints when content-driven breakpoints are required.
- Do not ignore landscape and hybrid input scenarios.

## Verify Adaptations

Validate across real-world environments:

- real devices (not emulation only)
- portrait and landscape orientation
- major browsers and operating systems
- multiple input methods (touch, mouse, keyboard)
- edge screens (very small and very large)
- constrained network scenarios

Ensure each adapted experience feels native to its context while preserving brand and task continuity.
