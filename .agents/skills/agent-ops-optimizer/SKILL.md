---
name: agent-ops-optimizer
description: Monitor multi-agent execution signals, recommend thread/depth/runtime tuning, and propose new specialized agent profiles based on recurring development patterns. Use when you want to optimize agent orchestration and decide whether new agents should be added.
---

# Agent Ops Optimizer

Tune agent orchestration using real repo signals instead of guesswork.

## Goal

1. Detect orchestration friction from memory events and recent git activity.
2. Recommend runtime parameters (`max_parallel_threads`, `max_delegation_depth`, `max_runtime_minutes`).
3. Recommend when to create new specialized agent profiles.

## Command

Run the report command:

```bash
npm run agent:ops:report
```

This writes:

- `docs/reports/agent-ops-latest.md`
- `docs/reports/agent-ops-latest.json`

## Decision Rules

1. Parameter tuning:
   - Apply only when the same recommendation appears in 2 consecutive runs.
   - Reduce parallelism/depth first when coordination incidents are high.
2. New profile creation:
   - Create a new profile when it appears in 2 consecutive runs and domain share remains high.
   - Add profile entries in `.codex/config.toml` and a matching prompt file in `.codex/agents/`.
3. Safety:
   - Never change `main` directly.
   - Keep profile additions small and validate after each change.

## Optional Variants

Longer window:

```bash
node .agents/skills/agent-ops-optimizer/scripts/analyze-agent-ops.mjs \
  --days 30 \
  --write docs/reports/agent-ops-30d.md \
  --json docs/reports/agent-ops-30d.json
```

## Validation

After applying any tuning change:

```bash
npm run check:instruction-drift
npm run validate
```
