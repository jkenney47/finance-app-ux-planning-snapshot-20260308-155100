---
name: napkin
description: Maintain per-repo working memory with a structured event log, curated rules, and ranked memory injection. Use this every session to prevent repeated mistakes and context loss.
---

# Napkin

More control, zero forgetting.

This skill is always active for this repo.

## Goal

Maintain a memory loop that stays useful over time:

1. Capture mistakes/corrections as structured events.
2. Rank relevant memories before and during work.
3. Promote repeated patterns into stable rules.

## Source of Truth

- `.agents/memory/events.ndjson`: append-only memory events.
- `.agents/memory/rules.md`: curated tracked rules.
- `.agents/memory/auto_rules.md`: generated local auto-promoted rules.
- `.agents/memory/index.json`: retrieval metadata.
- `.agents/napkin.md`: short operator-facing control plane.

## Session Loop

1. Before substantial work, load memory context:

```bash
bash .agents/hooks/codex-autopilot.sh start "<task summary>"
```

2. Run commands through autopilot so failures are captured automatically:

```bash
bash .agents/hooks/codex-autopilot.sh run "<task summary>" -- <command> [args...]
```

3. When a correction is known, write it immediately:

```bash
bash .agents/hooks/codex-autopilot.sh add \
  --source self \
  --trigger "<what triggered this>" \
  --mistake "<what went wrong>" \
  --correction "<what to do instead>" \
  --tags "tag1,tag2" \
  --confidence 0.9 \
  --severity 2
```

4. At checkpoints, promote repeats into rules:

```bash
bash .agents/hooks/codex-autopilot.sh checkpoint
```

## Retrieval Budget

- Inject only the top 3-5 memories for a task.
- Prefer precision over volume.
- If memory quality drops, run promotion and prune stale notes.

## Maintenance

- Keep high-signal curated rules in `.agents/memory/rules.md`.
- Let checkpoint-generated promotions live in `.agents/memory/auto_rules.md` so routine validation does not dirty tracked repo files.
- Run `rebuild-index` after manual edits to memory files:

```bash
node .agents/skills/napkin/scripts/memory_cli.mjs rebuild-index
```

- Git hooks auto-run checkpoint sync on commit, checkout, merge, and push.

## References

- Hook wiring: `references/hooks.md`
- Memory schema and ranking model: `references/memory-schema.md`
