---
name: onboard
description: Design and improve onboarding flows, first-time user experiences, and empty states that help users reach value quickly and confidently. Use when users are struggling to get started, dropping off early, or not reaching key activation milestones.
---

# Onboard

## Goal

Create onboarding that gets users to their first meaningful success quickly, with minimal friction and clear guidance.

## Input

- `target` (optional): feature, page, route, or product area needing onboarding improvements.
- If `target` is omitted, improve the most relevant first-use surface from the request.

## Assess Onboarding Needs

### 1) Identify the Challenge

- what users are trying to accomplish
- where confusion or drop-off happens
- current blockers to first success
- target "aha moment"

### 2) Understand Users

- experience level (beginner/power/mixed)
- motivation and urgency
- expected time commitment
- existing mental models and prior tools

### 3) Define Success

- minimum concepts required for user success
- key activation action to drive
- measurable success signals (completion, activation, time-to-value)

Onboarding should optimize time-to-value, not teach everything at once.

## Onboarding Principles

### Show, Do Not Lecture

- demonstrate through real product interaction
- teach one concept at a time
- prefer functional examples over explanatory walls of text

### Optionality for Experienced Users

- provide skip paths where possible
- avoid hard-blocking full product access
- allow self-directed exploration

### Time to Value First

- front-load essentials
- prioritize highest-value 20%
- defer advanced capability until context requires it

### Contextual Education

- teach at point-of-need, not only upfront
- treat empty states as onboarding surfaces
- use inline hints/tooltips/contextual prompts

### Respect User Intelligence

- avoid patronizing language
- keep copy concise and direct
- assume familiarity with common UI patterns

## Design Onboarding Experiences

### Initial Product Onboarding

- welcome framing: value proposition, outcome, honest time estimate, skip option
- account setup: minimum required data + rationale + smart defaults
- core concept intro: 1-3 core ideas via interactive steps
- first success: guide to a real completion with clear next step

### Feature Discovery and Adoption

- empty states with value explanation + first CTA + optional templates
- contextual tooltips tied to real moments, dismissible, non-repetitive
- feature announcements for new capabilities with immediate try-path
- progressive discovery via staged complexity

### Guided Tours and Walkthroughs

Use when complexity warrants structured guidance:

- short tours (typically 3-7 steps)
- spotlight relevant elements
- support skip/replay
- prefer workflow outcomes over UI trivia

### Interactive Tutorials

Use when safe practice is needed:

- sandbox/sample data
- clear objective + validation
- handoff/graduation to real usage

### Documentation and Help Integration

- contextual help links in UI
- searchable help center access
- keyboard shortcut hints where relevant
- concise "learn more" exits from inline guidance

## Empty State Design

Each empty state should include:

- what appears here
- why it matters
- how to start now
- visual reinforcement
- contextual help link

Support empty-state variants:

- first-use
- intentionally cleared
- no search/filter results
- permission-restricted
- error/loading-failed

## Implementation Patterns

- use tour/tooltip/modal patterns appropriate to stack
- track completion/dismissal state (for example local storage + server profile)
- instrument analytics for completion/drop-off/time-to-value

Do not repeatedly show dismissed onboarding.

## Non-Negotiables

- Do not force long onboarding before product usage.
- Do not repeat tips users have dismissed.
- Do not block exploration with rigid tour flows.
- Do not overload first-time users with all features.
- Do not hide skip options.
- Do not create tutorial flows disconnected from real product behavior.

## Verify Onboarding Quality

Validate with real user behavior:

- completion and skip rates
- comprehension after onboarding
- activation action completion
- time-to-value
- drop-off point concentration

Iterate based on observed friction, not assumptions. Great onboarding teaches just enough, at exactly the right moment.
