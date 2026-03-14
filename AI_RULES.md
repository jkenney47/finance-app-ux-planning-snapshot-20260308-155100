# AI AGENT RULES & CONTEXT

This is the canonical instruction source for coding agents in this repository and overrides conflicting instruction docs.

## 1) Project Truths (Immutable)

- Frontend: Expo + React Native + TypeScript + Expo Router.
- UI system: NativeWind utility classes + reusable primitives/components.
- Backend/data/auth/functions: Supabase.
- State management: Zustand.
- Navigation: file-based routing via `expo-router` in `app/`.

## 2) Explicitly Disallowed By Default

Do not introduce these unless a task explicitly requests them:

- aws lambda
- terraform
- tamagui

## 3) Coding Standards

- Use strict TypeScript and avoid `any` in new code.
- Use functional React components.
- Prefer NativeWind utility classes over ad-hoc `StyleSheet.create` except where required.
- Use design tokens from `theme/tokens.ts`.
- Keep files and naming aligned with existing project conventions.

## 4) Directory Intent

- `app/`: routes and screen entry points.
- `components/`: reusable UI components.
- `stores/`: Zustand state.
- `utils/`: domain/service logic.
- `supabase/functions/`: Supabase Edge Functions.
- `theme/`: design tokens and migration bridges.

## 5) Required Completion Gate

Before reporting task completion, run:

```bash
npm run validate
```

If any check fails, fix it before reporting success.

## 6) Documentation Routing

Use `docs/README.md` as the documentation index, then open task-specific docs from there.

## 7) Roadmap Autopilot + Commit Checkpoint Protocol (Required)

Default execution mode is roadmap autopilot:

- Continue through multiple ready roadmap items without pausing for per-feature approval.
- Use no fixed time cap; keep going until a stop trigger is reached.
- Stop triggers: hard blockers (missing access/secrets/env), destructive or irreversible actions, or explicit user stop.
- Treat acceptance criteria as completion checks, then immediately start the next highest-priority ready item.

At logical milestones, run a commit checkpoint routine but do not pause execution by default:

```bash
git status --short
git diff --name-only
git diff --cached --name-only
```

Checkpoint output must include one decision:

- `Commit now`
- `Split before commit`
- `Wait`

Commit policy:

- The agent owns checkpoint decisions and should choose commit timing without requiring per-checkpoint user approval.
- Choose `Commit now` when the current diff is a coherent PR-sized slice, validation for the slice passes, and no unresolved blocker remains.
- `Commit now` means create a commit and push it to the current non-main branch before continuing.
- Choose `Split before commit` when unrelated or oversized changes should be separated into multiple commits.
- Choose `Wait` only when validation is still running/failing, a blocker exists, or the user explicitly asks to hold commits.
- The agent also owns ready-branch merge timing unless a task-specific protocol explicitly forbids merging.
- Merge only after the relevant local validation passes, required hosted checks are green, and the branch is up to date with its base.
- Merge branches through the repo's normal PR flow; never push directly to `main`.
- Default to squash merge for normal PR integration in this repo because GitHub merge commits are disabled.
- Use rebase merge only when preserving multiple branch commits materially helps review/history and the hosted repo settings allow it.

## 8) Codex Multi-Agent Protocol (Required for MED/HIGH)

Risk-tier routing:

- `LOW`: single-agent execution is allowed.
- `MED`: role workflow is required (`planner -> implementer -> reviewer -> orchestrator merge`).
- `HIGH`: role workflow is required, plus explicit rollback and observability checks.

Risk-tier source of truth:

- Every new plan or product-plan work item must include a risk tier (`LOW` | `MED` | `HIGH`) and one-line rationale.
- If risk tier is missing, default to `MED`.

Execution requirements:

1. Planner pass
   - Produce decision-complete plan, target files, acceptance criteria, and validation checklist.
2. Implementer pass
   - Execute scoped changes with minimal diffs and concrete verification evidence.
3. Reviewer pass
   - Identify regressions, missing tests, and policy violations with prioritized findings.
4. Orchestrator merge
   - Resolve findings, ensure plan alignment, and confirm gates before completion.

Workflow states (must be used in handoffs/status updates):

- `Planned`
- `In Progress`
- `Human Review`
- `Rework`
- `Done`

Safety boundaries:

- Sub-agent approval/sandbox posture must not exceed the orchestrator session posture.
- Never include secrets, tokens, or `.env` contents in prompts.
- Codex orchestrator is accountable for final output quality.

Fallback:

- If profile-based multi-agent execution is unavailable, run equivalent planner/implementer/reviewer passes manually in sequence and record the fallback reason in task notes.

## 9) Jules Delegation Protocol (Manual by Default)

Role split:

- Codex (local): frontend and architecture implementation.
- Jules (cloud): QA/DevOps heavy lifting after local implementation.

Default rule:

- Do not create Jules sessions automatically.
- Do not commit/push solely to hand work to Jules unless the user explicitly asks for that handoff or the active implementation plan contains a manual cloud-follow-up step to run now.
- Prefer read-only CI gates and local validation first; use Jules only for explicit cloud follow-up after the local change set is ready.
- Respect the Jules account cap: never exceed `100` Jules sessions in any rolling `24`-hour window. If the budget is exhausted, stop and report it instead of creating another session.

Manual delegation workflow:

1. Secure local state
   - Ensure compile sanity (`npm run typecheck` minimum, or stricter checks when needed).
   - Work on a non-main branch; if currently on `main`/`master`, create `codex/<topic>` first.
   - Only if a Jules handoff is actually requested, stage/commit/push current work:

```bash
git add .
git commit -m "feat/fix: <brief description>"
git push -u origin HEAD
```

2. Manual handoff
   - Create a Jules remote session with a specific prompt:

```bash
jules remote new --repo jkenney47/Finance-App --session "<specific QA/DevOps task prompt>"
```

- Prompt must include: branch name, exact commands to run, expected output, and instruction to push fixes to the same branch.
- Never include secrets, PII, `.env` content, or private credentials in the prompt.

3. Debrief to user
   - Report why Jules was used and provide Jules tracking details.
   - Preferred format:
   - "I completed the local implementation and started the requested Jules follow-up. Jules session ID: <id>."

Follow-up after Jules completes:

```bash
jules remote pull --session <id> --apply
npm run validate
```

## 10) Pre-Merge Gatekeeper Protocol (Required)

You are the pre-merge gatekeeper for Jules-published work.

Hard rules:

- When running the pre-merge gatekeeper protocol, do not merge anything.
- Do not push to `main`.
- Do not rewrite history.
- If opening PRs, open as draft only.

Process:

1. Sync refs

```bash
git fetch --all --prune
```

2. Detect candidate branches
   - List remote branches excluding `main`/`master`.
   - Use `gatekeeper.jules.lastRun` from local git config as the "since last run" cutoff.
   - If no state exists, use a 24-hour window.
   - Prioritize recently updated branches where either:
     - latest commit author/committer name or email includes `jules` (case-insensitive), or
     - branch name matches agent-like patterns (`fix/*`, `chore/*`, `agent/*`, `codex/*`) and was updated recently.
   - Output candidate list with branch name, latest SHA, commit time, and author.

3. Review each candidate
   - Diff vs main:

```bash
git diff --stat origin/main...origin/<branch>
git diff origin/main...origin/<branch>
```

- Validation strategy:
  - If `package.json` exists, run minimum pre-merge checks first (`npm run typecheck`, `npm run lint`, `npm test`).
  - Escalate to `npm run validate` when risk is medium/high or when minimum checks fail.
  - Use repo documented equivalents for non-JS repos.
- Perform code review across correctness, security, regressions, maintainability, and test coverage.
- Classify findings into must-fix vs nice-to-have.

4. Produce one Markdown report
   - For each branch include:
     - summary of change
     - risk rating (LOW/MED/HIGH + why)
     - validation results (commands + pass/fail + key errors)
     - prioritized issues
     - suggested patch list (specific files/lines when possible)
     - merge recommendation (`MERGE` / `NEEDS CHANGES` / `DO NOT MERGE`)
     - exact follow-up tasks for Jules/Codex when `NEEDS CHANGES`

5. High-risk handling
   - If any branch is HIGH risk, add a `Blocker` section at the top with the top 1-3 urgent reasons not to merge.

Report output rule:

- When the user requests gatekeeper output, return only the Markdown report.

## 11) Cloud-First Automation Reliability (Required)

For automations expected to run while the local machine may be asleep or offline:

- Prefer cloud runners (for example GitHub Actions) over local-only schedules.
- Treat local automations as best-effort and not guaranteed during sleep/offline windows.
- Add retry and catch-up behavior so missed windows are handled on the next successful run.
- Keep unattended automations read-only by default; never auto-merge, never auto-create remediation PRs, and never push to `main`.

## 12) Preference Location

Store user-specific operating preferences in persistent memory rather than repository instruction files.

## 13) Persistent Memory Gate (Required)

Before substantial work:

1. Read:
   - `.agents/napkin.md`
   - `.agents/memory/rules.md`
2. Run:

```bash
bash .agents/hooks/codex-autopilot.sh start "<task summary>"
```

During work, default to autopilot-wrapped execution so failures are logged automatically:

```bash
bash .agents/hooks/codex-autopilot.sh run "<task summary>" -- <command> [args...]
```

If a correction is known (user or self), log it immediately:

```bash
bash .agents/hooks/codex-autopilot.sh add --source <self|user|system|tool> --trigger "<trigger>" --mistake "<mistake>" --correction "<correction>" --tags "tag1,tag2" --confidence 0.9 --severity 2
```

At checkpoints and pre-push/merge/checkout/commit, memory sync runs automatically via hooks. Manual fallback:

```bash
bash .agents/hooks/codex-autopilot.sh checkpoint
```

## 14) Skill Resolution Order

When the same skill name exists in both locations:

- `.agents/skills/<name>/SKILL.md`
- `$CODEX_HOME/skills/<name>/SKILL.md`

Prefer the repo-local `.agents/skills` version for this repository.
