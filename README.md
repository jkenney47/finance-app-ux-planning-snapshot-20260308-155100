# Finance-App UX Planning Snapshot

This repository is a public-safe UX planning packet derived from the private `Finance-App` codebase.

Purpose:
- share the current app experience with an external model for UX planning
- preserve enough nontechnical product context to reason about flows precisely
- avoid exposing secrets, backend implementation, internal operations, or automation details

What this snapshot includes:
- screenshot evidence for the main user-facing flows
- sanitized screen summaries for the main user-facing flows
- high-level product and planning context docs
- high-level design-system summary docs
- a curated screen screenshot set
- sanitized product and UX context docs

Screenshot note:
- `screenshots/onboarding-welcome.png`, `screenshots/home_dashboard.png`, `screenshots/roadmap_journey.png`, and `screenshots/step_detail.png` were refreshed from the current app state on March 13, 2026.
- `screenshots/accounts.png`, `screenshots/goals.png`, `screenshots/insights.png`, and `screenshots/profile.png` remain curated reference captures from the March 2, 2026 UI audit packet.

What this snapshot intentionally excludes:
- `.env*` files and secrets
- Git history from the private repo
- backend code, edge functions, and migrations
- internal ops surfaces, agent tooling, automations, and workflow files
- CI/CD and deployment scripts
- native project folders and external service configuration

Recommended use:
1. Start with [docs/APP_CONTEXT.md](docs/APP_CONTEXT.md).
2. Read [docs/OVERALL_PLAN.md](docs/OVERALL_PLAN.md) to understand where this UX work sits in the broader product roadmap.
3. Read [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md), [docs/TARGET_USER_AND_JOBS.md](docs/TARGET_USER_AND_JOBS.md), and [docs/CURRENT_UX_PRIORITIES.md](docs/CURRENT_UX_PRIORITIES.md).
4. Review [docs/SCREEN_INDEX.md](docs/SCREEN_INDEX.md) and [docs/SCREEN_SUMMARIES.md](docs/SCREEN_SUMMARIES.md).
5. Read [docs/DESIGN_SYSTEM_SUMMARY.md](docs/DESIGN_SYSTEM_SUMMARY.md).
6. Use the screenshots in `screenshots/` as the visual baseline.
7. Use [docs/UX_PLANNING_PROMPT.md](docs/UX_PLANNING_PROMPT.md) as the starter prompt for an external model.

Safety note:
- This repo is intended for UX planning only.
- It is not intended to run as a full application.
- Any implementation decisions should be brought back to the private repo.
