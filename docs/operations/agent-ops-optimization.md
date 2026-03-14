# Agent Ops Optimization

Use this loop to tune agent orchestration from real repo signals.

## Objective

- Recommend better runtime parameters (`max_parallel_threads`, `max_delegation_depth`, `max_runtime_minutes`).
- Detect when a new specialized agent profile should be created.

## Command

```bash
npm run agent:ops:report
```

Outputs:

- `docs/reports/agent-ops-latest.md`
- `docs/reports/agent-ops-latest.json`

## Inputs Used

- `.agents/memory/events.ndjson` (command-failure and coordination signals)
- `.codex/config.toml` (existing profile inventory)
- recent git history (domain change distribution)

## Apply Policy

1. Change runtime defaults only after the same recommendation appears in 2 consecutive runs.
2. Create a new profile only after the same candidate appears in 2 consecutive runs.
3. Keep profile adds small: update `.codex/config.toml`, add one prompt file in `.codex/agents/`, and validate.

## Required Gate After Changes

```bash
npm run check:instruction-drift
npm run validate
```
