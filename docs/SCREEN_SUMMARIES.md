# Screen Summaries

## Onboarding Welcome

- Role: first-run entry into the product experience
- User goal: understand the value proposition fast and choose a low-friction next step
- Main actions:
  - try demo
  - connect accounts
  - skip for now
- UX tension:
  - must communicate value before asking for account connection
  - should feel trustworthy and low-pressure rather than salesy

## Auth Welcome

- Role: auth-adjacent value screen
- User goal: understand the product promise and move into sign-in or sign-up
- Main actions:
  - sign in
  - create an account
- UX tension:
  - should not compete with onboarding welcome
  - should still communicate why the app is different from generic finance tools

## Sign In

- Role: returning-user access screen
- User goal: complete sign-in with minimal friction
- Main actions:
  - sign in
  - forgot password
  - move to account creation
- UX tension:
  - should feel fast and trustworthy, not promotional

## Sign Up

- Role: first account-creation screen
- User goal: create an account with clear expectations
- Main actions:
  - create account
  - move to sign-in
- UX tension:
  - should feel simple and safe
  - should not overwhelm with setup details too early

## Forgot Password

- Role: recovery path
- User goal: recover access without confusion
- Main action:
  - request reset

## Account Linking

- See [ACCOUNT_LINKING_CONTEXT.md](ACCOUNT_LINKING_CONTEXT.md).

## Dashboard Home

- Role: primary product surface
- User goal: understand the current recommendation and what to do next
- Main UX content:
  - current recommendation
  - why it fits now
  - confidence/trust context
  - alternatives and supporting metrics
- UX tension:
  - must feel decisive without oversimplifying
  - should not overload the user with too many panels at once

## Journey / Roadmap

- Role: milestone and sequencing surface
- User goal: understand how the current step fits into the broader roadmap
- Main UX content:
  - milestones
  - progress state
  - policy or data caveats
  - recommendation sequencing
- UX tension:
  - must balance roadmap visibility with readability

## Insights

- Role: trend and explanation surface
- User goal: understand what the data suggests and what to do with it
- Main UX content:
  - observed financial trends
  - explanatory summaries
  - ask/explain action
- UX tension:
  - should feel useful, not like generic analytics dashboards

## Accounts

- Role: linked-account and data-coverage support surface
- User goal: understand what is connected, what is missing, and what improves after reconnecting or linking
- Main UX content:
  - balances
  - institution grouping
  - reconnect needs
  - empty/error states
- UX tension:
  - should feel reassuring and practical, not technical

## Goals

- Role: target and progress surface
- User goal: understand what they are saving toward and how progress is tracked
- Main UX content:
  - goals list
  - progress
  - create/manage goal flows
- UX tension:
  - should feel motivating without becoming cluttered

## Profile

- Role: preferences, coverage, and workspace controls
- User goal: manage settings and understand the health of their setup
- Main UX content:
  - appearance and advisor preferences
  - data coverage and confidence
  - quick links to related surfaces
- UX tension:
  - must avoid feeling like a settings dump

## Step Detail

- Role: recommendation deep dive
- User goal: understand why a recommendation exists and compare alternatives
- Main UX content:
  - rationale
  - tradeoffs
  - supporting facts
  - alternatives
- UX tension:
  - should deepen trust without drowning the user in explanation
