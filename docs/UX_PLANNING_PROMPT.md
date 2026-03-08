# Starter Prompt For External UX Planning

Use this as a starting point with an external model:

```text
You are reviewing a mobile personal finance app UX planning packet.

Start by reading:
- docs/APP_CONTEXT.md
- docs/OVERALL_PLAN.md
- docs/PRODUCT_VISION.md
- docs/TARGET_USER_AND_JOBS.md
- docs/CURRENT_UX_PRIORITIES.md
- docs/UX_SCOPE.md
- docs/SCREEN_INDEX.md
- docs/SCREEN_SUMMARIES.md
- docs/MOCK_SCENARIOS.md
- docs/DESIGN_SYSTEM_SUMMARY.md

Then review the relevant files under:
- screenshots/

Your job is to help improve UX first, then inform visual redesign.

Please focus on:
- where the product currently sits in its roadmap and what this UX phase should shape
- what each screen is trying to accomplish
- whether the user goal is clear
- whether the primary action is obvious
- where the flow creates friction or confusion
- what information is missing or overloaded
- how onboarding, dashboard, roadmap, and supporting surfaces should relate to each other
- what sequence we should use for redesign work

Constraints:
- preserve the app's calm, trustworthy, premium fintech direction
- avoid hype-driven investing language
- avoid generic AI-assistant UX patterns
- keep guidance clear and low-jargon
- treat account linking as a trust-sensitive optional upgrade, not the first source of value
- assume implementation will happen later in a private repo

Output requested:
1. high-level UX diagnosis
2. screen-by-screen UX recommendations
3. flow-level changes that should happen before visual redesign
4. a prioritized redesign order
5. open questions that should be resolved by product/design
```
