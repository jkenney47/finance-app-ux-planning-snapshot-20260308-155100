# Figma Node Map (UI Baseline Audit 2026-03-03)

- Figma file: https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P
- File key: `h8JgtXtfJLhbIWgchswF2P`
- Capture method: MCP HTML-to-design capture from Expo web (`http://127.0.0.1:8081`)
- Notes: Node IDs below map to the latest captured baseline frames (x positions `3900` through `19500`).

| Route                                        | File Key                 | Node ID | Figma URL                                                        | Capture Notes                                                                                                                                          |
| -------------------------------------------- | ------------------------ | ------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/(dashboard)` (Home)                        | `h8JgtXtfJLhbIWgchswF2P` | `4:2`   | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=4-2  | Advisor Home with Next Best Step hero and Ask FAB context `Ask (dashboard)`.                                                                           |
| `/journey` (Roadmap)                         | `h8JgtXtfJLhbIWgchswF2P` | `5:2`   | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=5-2  | Financial Roadmap stage timeline, recommendation card, milestones, and policy status card.                                                             |
| `/insights`                                  | `h8JgtXtfJLhbIWgchswF2P` | `6:2`   | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=6-2  | Insights shell with trust/disclosure blocks, confidence badge, and Ask actions.                                                                        |
| `/profile`                                   | `h8JgtXtfJLhbIWgchswF2P` | `7:2`   | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=7-2  | Profile and preferences sections (coverage, appearance, voice, security, legal).                                                                       |
| `/accounts`                                  | `h8JgtXtfJLhbIWgchswF2P` | `8:2`   | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=8-2  | Accounts summary with empty/no-accounts action state and link CTAs.                                                                                    |
| `/goals`                                     | `h8JgtXtfJLhbIWgchswF2P` | `9:2`   | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=9-2  | Goals summary with first-goal empty state and creation CTA.                                                                                            |
| `/step/capture_employer_match` (Step Detail) | `h8JgtXtfJLhbIWgchswF2P` | `10:2`  | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=10-2 | Step Detail screen sections ordered per trust spec: summary, suggested option, alternatives, rationale, second-order effects, and measurement details. |
| `/agent-hub`                                 | `h8JgtXtfJLhbIWgchswF2P` | `11:2`  | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=11-2 | Agent provider/test console surface (ops route) with run workflows and details panels.                                                                 |
| `/policy-ops`                                | `h8JgtXtfJLhbIWgchswF2P` | `12:2`  | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=12-2 | Policy operations surface (ops route) with policy packs, refresh checks, governance, and audit logs.                                                   |
| `/ui-lab`                                    | `h8JgtXtfJLhbIWgchswF2P` | `13:2`  | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=13-2 | Sandbox route used for reusable components and state previews.                                                                                         |
| `/welcome`                                   | `h8JgtXtfJLhbIWgchswF2P` | `14:2`  | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=14-2 | Unauthenticated welcome route with demo/connect CTA pair.                                                                                              |
| `/(onboarding)`                              | `h8JgtXtfJLhbIWgchswF2P` | `15:2`  | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=15-2 | Onboarding index currently renders the welcome-stage view in this capture state.                                                                       |
| `/plaid-link`                                | `h8JgtXtfJLhbIWgchswF2P` | `16:2`  | https://www.figma.com/design/h8JgtXtfJLhbIWgchswF2P?node-id=16-2 | Plaid/linking flow screen with simulated link action and skip CTA.                                                                                     |

## Verification Notes

- Node IDs were verified from `mcp__figma__get_metadata` per frame.
- Route captures were triggered from Playwright with `capture.js` injection and per-route single-use capture IDs.
- Some routes make background requests that error under local/mock env, but frame capture still completed for layout auditing.
