# Memory Schema

## Event Record (`.agents/memory/events.ndjson`)

Each line is one JSON object.

Required fields:

- `date` (`YYYY-MM-DD`)
- `source` (`self`, `user`, `system`, `tool`)
- `trigger` (what context/action surfaced the issue)
- `mistake` (what went wrong)
- `correction` (what to do instead)
- `tags` (string array)
- `confidence` (`0.0` to `1.0`)

Additional fields maintained by tooling:

- `id`
- `timestamp` (ISO 8601)
- `severity` (`0` to `3`)

Example:

```json
{
  "id": "20260216071000-1a2b3c4d",
  "timestamp": "2026-02-16T07:10:00.000Z",
  "date": "2026-02-16",
  "source": "self",
  "trigger": "lint",
  "mistake": "Assumed cached lint state was fresh",
  "correction": "Run full validate before reporting completion",
  "tags": ["lint", "validate"],
  "confidence": 0.9,
  "severity": 2
}
```

## Ranking Model

Ranking combines:

- Query match (trigger, tags, mistake, correction)
- Recency (decays over time)
- Severity
- Confidence
- Repeat-frequency bonus

Guidelines:

- Inject top 3-5 items into context.
- Prefer high-confidence, repeated patterns.
- Avoid flooding context with low-signal matches.
- `codex-autopilot.sh start` writes ranked output to `.agents/memory/active_context.md`.

## Promotion Rules

Repeated events are promoted into `.agents/memory/auto_rules.md` when count >= threshold.

- `.agents/memory/rules.md` remains curated tracked guidance.
- `.agents/memory/auto_rules.md` is generated local state and should stay ignored.
- Ranking reads both files so curated guidance and repeated autopilot lessons still surface together.

## Autopilot Defaults

For automatic operation:

- Start task context with:
  - `bash .agents/hooks/codex-autopilot.sh start "<task summary>"`
- Execute commands with auto-failure capture:
  - `bash .agents/hooks/codex-autopilot.sh run "<task summary>" -- <command> [args...]`
- Sync promotion/index at checkpoints:
  - `bash .agents/hooks/codex-autopilot.sh checkpoint`
