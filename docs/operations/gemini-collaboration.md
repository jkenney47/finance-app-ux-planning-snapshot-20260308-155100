# Gemini Collaboration Runbook

Last updated: 2026-03-05
Audience: Codex operators in this repository

## Goal

Use Gemini as a read-only reviewer to improve plan quality and catch regressions while Codex remains the only tool that edits code and makes final implementation decisions.

## Defaults

- Use read-only mode: `--approval-mode plan`
- Use this model strategy unless overridden: discover installed `gemini-*-pro*` models and try newest first, then fallback:
  `gemini-3.1-pro-preview` -> `gemini-3-pro-preview` -> `pro` -> `gemini-2.5-pro`
- Keep Codex as executor and gatekeeper for all code changes

## Boundary with Codex Multi-Agent

- For `MED/HIGH` risk tasks, Codex role workflow is required (`planner -> implementer -> reviewer -> orchestrator merge`).
- Gemini findings are advisory inputs to Codex roles.
- Gemini is not a replacement for the required Codex reviewer role.

## Prerequisites

1. Gemini CLI installed:

```bash
gemini --version
```

2. Gemini auth configured for non-interactive CLI runs:

```bash
# preferred
export GEMINI_API_KEY=your_key_here

# supported aliases (auto-mapped by scripts/gemini-collab.sh)
export GOOGLE_GENAI_API_KEY=your_key_here
export GOOGLE_API_KEY=your_key_here
```

You can also place any of those keys in `.env.local` or `.env`.

3. Repo helper commands are available from `package.json`:

```bash
npm run gemini:collab:help
```

## Standard loop

1. Draft concrete plan in Codex.
2. Finalize plan before editing code:

```bash
npm run plan:finalize -- docs/PRODUCT_PLAN.md "Codex approval summary"
```

3. Implement with Codex.
4. Run Gemini diff/screenshot gates before final validation for UI work.
5. Run `npm run validate`.

For plan files and implementation commits in this repo, automation enforces plan gates:

- `npm run plan:auto-review` runs in `.husky/pre-commit`.
- `npm run plan:guard` runs in `.husky/pre-commit`.
- `npm run plan:implementation:guard` runs in `.husky/pre-commit`.
- `plan:auto-review` automatically runs Gemini review for staged plan files and restages metadata/artifacts.
- In Codex Plan mode (`CODEX_COLLABORATION_MODE=plan` or equivalent), active-plan changes are automatically included for review.
- If implementation-path files change without an active plan that has Gemini review + Codex final approval metadata, commit fails.
- Active plan pointer: `.agents/plan/current-plan.txt`.

## Commands

### 1) Plan critique

Provide plan text either as an argument or from stdin.

```bash
npm run gemini:collab:plan -- "Implement feature X with Y"
```

or

```bash
cat path/to/plan.md | npm run gemini:collab:plan
```

For plan files you intend to commit, use the automated review command:

```bash
npm run plan:review -- docs/PRODUCT_PLAN.md
```

This command:

- runs Gemini critique against the plan file
- writes an artifact in `artifacts/plan-reviews/`
- updates the plan with `Gemini-Review-*` metadata

For the full enforced sequence (Gemini review + Codex final approval + active plan pointer), use:

```bash
npm run plan:finalize -- docs/PRODUCT_PLAN.md "Codex approval summary"
```

### 2) Diff review

Review all unstaged changes:

```bash
npm run gemini:collab:diff
```

Review only selected areas:

```bash
npm run gemini:collab:diff -- app components utils
```

### 3) Frontend screenshot review

Use an absolute or repo-relative image path:

```bash
npm run gemini:collab:screenshot -- /absolute/path/to/screen.png "iPhone 16 Pro dashboard QA"
```

### 4) Gate-mode JSON outputs (for CI/autopilot)

Diff gate:

```bash
npm run gemini:collab:diff-gate -- app components hooks stores theme utils scripts maestro
```

Screenshot gate:

```bash
npm run gemini:collab:screenshot-gate -- --dir artifacts/ui-review/<timestamp>/screenshots --limit 12
```

Both commands return strict JSON with `verdict`, `highestSeverity`, and normalized issues.
Gate policy: fail when any `P0`/`P1` issue is present.

### 5) Failure triage

Run a command and ask Gemini to triage its output:

```bash
npm run gemini:collab:triage -- npm run validate
```

By default, triage returns Gemini analysis and does not fail the shell based on command status.
If you want strict exit behavior, set:

```bash
GEMINI_TRIAGE_STRICT=true npm run gemini:collab:triage -- npm run validate
```

## Frontend review checklist

Ask Gemini to explicitly evaluate:

- loading, error, empty, and offline states
- accessibility labels and interaction targets
- spacing, hierarchy, and text truncation
- token consistency and styling drift
- render/state performance pitfalls

## Safety rules

- Never paste secrets (`.env`, API keys, tokens) into prompts.
- Keep Gemini in read-only approval mode (`plan`).
- Treat Gemini findings as advisory until Codex verifies in code and checks.
