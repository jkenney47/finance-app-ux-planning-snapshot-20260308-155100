# Hook Wiring

This skill provides shell hook stubs in `.agents/hooks/`.

## Available Stubs

- `.agents/hooks/pre-task.sh`
- `.agents/hooks/post-error.sh`
- `.agents/hooks/pre-response.sh`
- `.agents/hooks/codex-autopilot.sh`
- `.agents/hooks/git-memory-sync.sh`

## Intended Behavior

- `pre-task.sh`: ranks and prints top memories for the current task.
- `post-error.sh`: records a memory event as soon as an error/correction is known.
- `pre-response.sh`: prints top memories to support final response quality.
- `codex-autopilot.sh`: end-to-end wrapper for `start`, `run`, `add`, and `checkpoint`.
- `git-memory-sync.sh`: non-blocking checkpoint sync used by Husky hooks.

## Stub Usage

Autopilot start:

```bash
.agents/hooks/codex-autopilot.sh start "task summary text"
```

Autopilot command execution with auto failure capture:

```bash
.agents/hooks/codex-autopilot.sh run "task summary text" -- npm run validate
```

Autopilot correction logging:

```bash
.agents/hooks/codex-autopilot.sh add \
  --source self \
  --trigger "typecheck" \
  --mistake "Used wrong path" \
  --correction "Use .agents/memory/* paths" \
  --tags "paths,memory" \
  --confidence 0.9 \
  --severity 2
```

Legacy direct retrieval:

```bash
.agents/hooks/pre-task.sh "task summary text"
```

Legacy direct post-error logging:

```bash
.agents/hooks/post-error.sh \
  --source self \
  --trigger "typecheck" \
  --mistake "Used wrong path" \
  --correction "Use .agents/memory/* paths" \
  --tags "paths,memory" \
  --confidence 0.9 \
  --severity 2
```

Pre-response retrieval:

```bash
.agents/hooks/pre-response.sh "response summary text"
```

## Notes

- The stubs are generic and can be wired into any automation or runner.
- Keep query text short and task-specific for better ranking quality.
- Do not inject more than five memories into active context.
- Husky hooks call `git-memory-sync.sh` on commit, checkout, merge, and push.
