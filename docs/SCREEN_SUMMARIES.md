# Screen Summaries

## Onboarding Welcome

- Role: first-run entry into the roadmap-building experience
- User goal: understand the value proposition fast and choose a low-friction next step
- Main actions:
  - see how it works
  - sign in
- UX tension:
  - must communicate value before asking for account creation or account connection
  - should feel trustworthy and low-pressure rather than salesy

## Onboarding Sequence

- Role: structured first-run path from preview to personalized roadmap
- User goal: move from curiosity to a believable first plan without feeling interrogated
- Current sequence:
  - welcome
  - demo roadmap
  - account creation
  - intake intro plus guided questionnaire
  - intake summary
  - why-linking explanation
  - account-link step
  - generating roadmap
  - roadmap reveal
- UX tension:
  - should feel progressively more tailored, not longer for its own sake
  - must make the required linking gate feel earned rather than abrupt

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

## Roadmap Reveal

- Role: onboarding payoff screen after linking
- User goal: understand the first stage, current focus, and the first action the app recommends
- Main UX content:
  - current stage
  - current focus
  - next action
  - key metric
  - summary explanation of why the user is placed there
- UX tension:
  - should feel like a meaningful payoff for setup effort
  - must set up a clear handoff into Home, Roadmap, and Step Detail

## Dashboard Home

- Role: primary recurring planning surface
- User goal: understand the current focus and what to do next
- Main UX content:
  - current focus
  - next action
  - confidence / coverage context
  - key metric
  - compact financial snapshot
- UX tension:
  - must feel decisive without oversimplifying
  - should not duplicate too much of Roadmap or Step Detail
  - should not overload the user with too many panels at once

## Journey / Roadmap

- Role: stage and sequencing surface
- User goal: understand how the current step fits into the broader roadmap
- Main UX content:
  - current stage
  - stage timeline
  - why the stage is current
  - goal impacts
  - limitations and recommended coverage upgrades
- UX tension:
  - must balance roadmap visibility with readability
  - should feel meaningfully different from Home, not like the same card rearranged

## Insights

- Role: secondary explanation surface
- User goal: inspect trends or narrative context without replacing the core roadmap loop
- Main UX content:
  - observed financial trends
  - explanatory summaries
  - ask/explain action
- UX tension:
  - should feel useful, not like generic analytics dashboards
  - is currently hidden from primary navigation, so its job needs to be more focused

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

- Role: secondary target and progress surface
- User goal: understand what they are saving toward and how progress is tracked
- Main UX content:
  - goals list
  - progress
  - create/manage goal flows
- UX tension:
  - should feel motivating without becoming cluttered

## Profile

- Role: preferences, coverage, and support-surface launcher
- User goal: manage settings and understand the health of their setup
- Main UX content:
  - appearance and advisor preferences
  - data coverage and confidence
  - quick links to related surfaces
- UX tension:
  - must avoid feeling like a settings dump
  - should clarify whether it is a true tab destination or mainly a utility hub

## Step Detail

- Role: recommendation deep dive
- User goal: understand why a recommendation exists and compare alternatives
- Main UX content:
  - rationale
  - tradeoffs
  - supporting facts
  - alternatives
  - data-support / coverage context
- UX tension:
  - should deepen trust without drowning the user in explanation
  - should feel like a drill-down from Home, not a separate competing planning surface
