# Napkin Control Plane

This file is the operator view.
Source-of-truth memory is split across:

- `.agents/memory/events.ndjson`
- `.agents/memory/rules.md`
- `.agents/memory/auto_rules.md` (generated local promotions)
- `.agents/memory/index.json`

## Session Checklist

1. Start autopilot for the current task:

```bash
bash .agents/hooks/codex-autopilot.sh start "<task summary>"
```

2. Run commands through autopilot so failures are auto-captured:

```bash
bash .agents/hooks/codex-autopilot.sh run "<task summary>" -- <command> [args...]
```

3. Log known corrections immediately:

```bash
bash .agents/hooks/codex-autopilot.sh add --source self --trigger "<trigger>" --mistake "<mistake>" --correction "<correction>" --tags "tag1,tag2" --confidence 0.9 --severity 2
```

4. Promote repeated events into rules at checkpoints:

```bash
bash .agents/hooks/codex-autopilot.sh checkpoint
```

## Retrieval Cues

- transcript-memory
- hook-ranking
- context-injection
- corrections
- mistakes

## Notes

- Keep memory injection to top 3-5 items per task.
- Favor repeated and high-confidence patterns.
- Run `rebuild-index` after manual edits to memory files.
- Husky hooks auto-run memory checkpoint on commit/checkout/merge/push.
