# Agent Workflow Notes

This file captures the minimal, repo-grounded workflows and commands agents should use.
For full rules, follow `AI_RULES.md`.

## Read Order

1. `AI_RULES.md`
2. `DEVELOPMENT.md`
3. `docs/SYSTEM_MAP.md`
4. `CODEX.md`
5. Task-specific files

## Codex Workflow Playbook

- Use `CODEX.md` as the Codex-adapted workflow orchestration guide.
- This is a skill/instruction workflow, not an automation schedule.

## Codex Multi-Agent Quickstart

- For `MED/HIGH` risk tasks, use role workflow: `planner -> implementer -> reviewer -> orchestrator merge`.
- If risk tier is missing, default to `MED`.
- Role config and prompts live in `.codex/config.toml` and `.codex/agents/`.
- Runbook: `docs/operations/codex-multi-agent.md`.

## Skill Resolution Order

When a skill name exists in both local and global skill folders, prefer repo-local skills under `.agents/skills/`.

## Memory + Autopilot

Run before substantial work:

```bash
cat .agents/napkin.md
cat .agents/memory/rules.md
```

Start autopilot:

```bash
bash .agents/hooks/codex-autopilot.sh start "<task summary>"
```

TODO: If `codex-autopilot.sh start` fails due to `active_context.md` permissions, confirm correct permissions/ownership for `.agents/memory/active_context.md`.

Run commands through autopilot:

```bash
bash .agents/hooks/codex-autopilot.sh run "<task summary>" -- <command> [args...]
```

Log known corrections immediately:

```bash
bash .agents/hooks/codex-autopilot.sh add --source <self|user|system|tool> --trigger "<trigger>" --mistake "<mistake>" --correction "<correction>" --tags "tag1,tag2" --confidence 0.9 --severity 2
```

At milestones:

```bash
bash .agents/hooks/codex-autopilot.sh checkpoint
```

## Docs Index

- Use `docs/README.md` as the documentation index.
- Use `docs/PRODUCT_PLAN.md` as the single source-of-truth development plan.
- Active design doc: `docs/architecture/ai-financial-advisor-design-doc.md`.
- API reference: `docs/reference/endpoints.md`.
- Operations runbook: `docs/operations/runbook.md`.
- Agent orchestration runbook: `docs/operations/agent-orchestration.md`.
- Codex multi-agent runbook: `docs/operations/codex-multi-agent.md`.
- Agent-only readiness scorecard: `docs/operations/agent-only-readiness.md`.
- Quality gates: `docs/operations/quality-gates.md`.
- Gemini collaboration runbook: `docs/operations/gemini-collaboration.md`.
- Agent entry point: `START_HERE.md`.
- Completion report template: `AGENT_TASK_TEMPLATE.md`.

## Standard Commands

```bash
npm run bootstrap
npm run start
npm run ios
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run depgraph:check
npm run agent:ops:report
npm run validate
npm run e2e
npm run test:agent-sandbox
```

`bootstrap` verifies Node `20.x` and installs dependencies.

## E2E + UX Loop

- Run one Maestro flow: `npm run e2e -- <flow-name>`
- List supported Maestro flows: `npm run e2e -- --list`
- Run one UX loop flow and capture artifacts: `npm run ux:loop -- <flow-name>`
- Run full UX loop smoke batch: `npm run ux:loop:all`
- List UX loop flows: `npm run ux:loop -- --list`

## Gemini Collaboration (Read-Only)

- Plan critique: `npm run gemini:collab:plan -- "<plan text>"`
- Diff critique: `npm run gemini:collab:diff -- app components utils`
- Screenshot critique: `npm run gemini:collab:screenshot -- /absolute/path/to/screen.png "context"`
- Failure triage: `npm run gemini:collab:triage -- npm run validate`
- Plan-file review metadata/artifact: `npm run plan:review -- <plan-file>`
- Commit-time plan guard: `npm run plan:guard`

## Rollout Checks (Shared QA)

- Phase A evidence capture: `npm run rollout:phase-a -- --phase ALL`
- Ingestion reliability check: `npm run rollout:ingestion -- --window-hours 24`

## Environment Setup

1. Create `.env.local` (preferred) or `.env`.
2. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. If you copy `env.example`, replace every `YOUR_...` placeholder you keep, or remove those lines.
4. Run `npm run validate:env`.

## Required Completion Gate

Before reporting completion:

```bash
npm run validate
```

## Commit Checkpoint

At milestones, run:

```bash
git status --short
git diff --name-only
git diff --cached --name-only
```

Then provide one decision: `Commit now`, `Split before commit`, or `Wait`.
Follow `AI_RULES.md` for decision policy: the agent determines commit/push timing, `Commit now` includes pushing to the current non-main branch, and `Wait` is only for blockers/failing validation/explicit hold requests.

## TODO

- Confirm whether any additional workflows beyond the docs above should be captured here.
