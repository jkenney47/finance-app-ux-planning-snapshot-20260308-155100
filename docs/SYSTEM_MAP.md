# System Map

Use this map to quickly locate the right place to implement changes.

## Routing and Screens

- Add or change screens/routes: `app/`
- Auth flows: `app/(auth)/`, `app/(unauth)/`
- Primary user dashboard surfaces: `app/(dashboard)/`
- Canonical operator surfaces: `app/(ops)/`
- Canonical internal QA/sandbox surfaces: `app/(internal)/`
- Shared screen implementations for redirected/internal routes: `app/_screens/`
- Legacy dashboard aliases that redirect to canonical operator/internal ownership:
  - `app/(dashboard)/policy-ops.tsx`
  - `app/(dashboard)/agent-hub.tsx`
  - `app/(dashboard)/ui-lab.tsx`

## UI and Theme

- Reusable UI components: `components/`
- Theme bridge: `theme/paper.ts`
- Design tokens: `theme/tokens.ts`

## Data and Logic

- Domain logic and service adapters: `utils/`
- Global/local app state: `stores/`
- Shared types: `types/`
- Reusable hooks: `hooks/`

## Backend and Database

- Supabase edge functions: `supabase/functions/`
- SQL migrations: `supabase/migrations/`
- Schema snapshot: `schema.sql`

## Tests and Quality

- Unit/integration tests: `__tests__/`
- Jest configuration: `jest.config.js`, `jest.setup.js`
- Lint configuration: `.eslintrc.cjs`
- TypeScript configuration: `tsconfig.json`

## CI and Contribution Flow

- PR quality gate: `.github/workflows/lint.yml`
- Implementation plan gate: `.github/workflows/plan-gate.yml`
- Local UI review tooling: `scripts/ui-review.sh`
- PR template: `.github/PULL_REQUEST_TEMPLATE.md`

## Agent Execution Rules

- Canonical rules: `AI_RULES.md`
- Working guide: `DEVELOPMENT.md`
- Canonical entry pointer: `START_HERE.md`
- Docs index: `docs/README.md`
- Codex pointer (supporting): `CODEX.md`
- Orchestration policy: `docs/operations/agent-orchestration.md`
- Codex role workflow: `docs/operations/codex-multi-agent.md`
- Runtime memory (non-canonical support): `.agents/memory/rules.md`
- Completion report template: `AGENT_TASK_TEMPLATE.md`
