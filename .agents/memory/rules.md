# Memory Rules

## User Preferences

- Use repo-native agent paths and filenames under `.agents/`.
- Prefer implementation over brainstorming when a concrete recommendation is requested.
- User is non-technical and relies on Codex for technical decisions.
- Default to the recommended path and execute it unless blocked by a high-impact ambiguity.
- Automatically execute recommended next steps without asking again unless the action is destructive, irreversible, or blocked by missing access/secrets.
- If no further implementation steps remain and the recommended next step is to open a PR, automatically complete the PR flow instead of stopping at a recommendation.
- Explain outcomes in plain language and avoid unexplained jargon.
- Provide exact file paths and exact commands when action is required.
- Use roadmap-autopilot execution: continue through multiple ready roadmap items without pausing per feature.
- Do not use a fixed batch time cap; continue working until a stop trigger is reached.
- Stop triggers are hard blockers (missing access/secrets/env), destructive or irreversible actions, or an explicit user stop.
- Treat acceptance criteria as completion checks, then immediately start the next highest-priority ready item.
- Ask questions only when no safe default exists.
- The agent owns commit, push, and ready-branch merge timing unless a task-specific protocol explicitly forbids merging.
- At commit checkpoints, choose `Commit now` for coherent validated slices; choose `Wait` only for blockers, failing validation, or an explicit user hold.
- Merge branches only after required local validation and hosted checks pass, and never push directly to `main`.
- Default to squash merge for normal PR integration in this repo because hosted merge commits are disabled.
- Do not create Jules sessions automatically; use Jules only for explicit manual follow-up.
- Respect the Jules daily quota: never create more than 100 Jules sessions in any 24-hour period.
- Keep track of the repo's software and toolchain versions, and proactively recommend upgrades when they would materially improve stability, security, compatibility, or developer efficiency.
- When autonomous Jules delegation is triggered, commit/push is required before creating the Jules session handoff.
- For pre-merge gatekeeper requests, output only the Markdown review report and never merge, push to `main`, or rewrite history.
- For unattended schedules, prefer cloud-run workflows over local-only automations because local runs pause during system sleep/offline periods.
- For UI changes, default to Codex + Xcode/Simulator + Maestro artifact loop; do not require Figma.
- For UI changes, use strict iOS validation (small + large iPhone, max Dynamic Type, landscape, VoiceOver quick pass).
- For UI validation, iPad/tablet coverage is opt-in only for now; default to iPhone unless the feature explicitly targets adaptive tablet layouts or the user asks for tablet checks.

## Operating Rules

- Before substantial work, read `.agents/napkin.md` and this file.
- Inject at most 5 ranked memories into active context.
- Use `bash .agents/hooks/codex-autopilot.sh start "<task summary>"` at task start.
- Run terminal commands through `bash .agents/hooks/codex-autopilot.sh run "<task summary>" -- <command>`.
- Log known corrections with `bash .agents/hooks/codex-autopilot.sh add ...` immediately.
- Run `bash .agents/hooks/codex-autopilot.sh checkpoint` at milestones.
- Treat `.agents/memory/active_context.md` as generated and non-authoritative.
- Treat `.agents/memory/auto_rules.md` as generated and non-authoritative.
- Treat `.agents/memory/events.ndjson` and `.agents/memory/index.json` as generated local state, not tracked repo authority.

## Development Defaults

- Implement end-to-end: code changes, verification, and clear summary.
- Run `npm run validate` before reporting completion.
- If blocked, report the exact command and exact error.
- Do not ask the user to choose technical implementation details unless unavoidable.
- Prefer safe, reversible changes over risky broad rewrites unless explicitly requested.
- Preserve unrelated user changes in a dirty working tree.

## Communication Defaults

- Lead with what changed, then why it was necessary.
- Keep updates concise and concrete while work is in progress.
- Offer recommended next steps only when they are natural and actionable.

## Generated Promotions

- Auto-promoted checkpoint output now lives in ignored local state at `.agents/memory/auto_rules.md`.
- Keep this tracked file focused on curated guidance and stable preferences.
