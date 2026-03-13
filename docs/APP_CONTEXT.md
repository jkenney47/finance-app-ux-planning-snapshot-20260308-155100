# App Context

## Product

Finance-App is an iOS-first personal finance app focused on helping users understand their financial situation, see the next best step, and follow a practical roadmap across savings, debt payoff, cash-flow stability, and longer-term progress.

The product should not feel like:
- a spreadsheet-heavy budgeting app
- a hype-driven investing app
- a generic AI assistant with vague advice

The product should feel:
- calm
- intelligent
- trustworthy
- direct
- action-oriented

## Primary User

A non-technical consumer user who wants clear financial direction without jargon, complexity, or pressure.

## Core Product Principles

- Clarity over complexity
- Confidence without hype
- Guidance without pressure
- Practical next steps instead of generic financial content
- Transparent rationale and tradeoffs
- Trust and user control, especially around connected financial accounts
- Premium but approachable mobile experience

## UX Principles

- The app should explain what it is doing and why.
- One primary action should be obvious on every major screen.
- Users should be able to see value before committing to high-friction setup.
- Recommendation quality and confidence should be understandable, not hidden.
- Empty, loading, and error states are first-class parts of the experience.

## Main User Flows

- Auth: welcome, sign in, sign up, forgot password
- Onboarding: welcome -> demo roadmap -> account creation -> guided intake -> summary -> link explanation -> account link -> roadmap reveal
- Dashboard home: see the current focus, next action, key metric, and a compact financial snapshot
- Journey / roadmap: understand stage sequencing, what is current vs upcoming, and why the user is placed there
- Step detail: inspect the active recommendation, reasoning, limitations, and tradeoffs
- Profile: preferences, data-health context, and entry points into secondary surfaces
- Secondary surfaces: insights, accounts, and goals still exist, but they are no longer equal-weight primary navigation destinations

## Current Design Direction

The current app is moving toward a calmer roadmap-first experience with a clearer distinction between primary planning surfaces and secondary management surfaces. This packet is intended to help refine information hierarchy, flow clarity, screen purpose, and visual direction now that the shared roadmap model is live across the main planning screens.
