---
name: gemini-second-opinion
description: Use the repo's Gemini collaboration flow to get a read-only second opinion before implementation or to critique a plan, diff, screenshot, or failing command. Use when the user asks for Gemini review, a second opinion, plan review before coding, or Gemini QA gates. Avoid when you still need to create the plan itself or when the required Codex reviewer pass should own the final review.
---

# Gemini Second Opinion

## Goal

Use this repo's Gemini wrappers to critique plans and changes while keeping Codex as the executor and final gatekeeper.

## Default Stance

- Gemini is advisory only.
- Keep Gemini read-only.
- Prefer repo wrappers over raw `gemini` CLI calls.
- For implementation-path work, finalize the active plan before editing code.

## Use These Commands

- Plan critique from text:
  - `npm run gemini:collab:plan -- "<plan text>"`
- Plan-file review metadata and artifact:
  - `npm run plan:review -- <plan-file>`
- Full pre-implementation plan gate:
  - `npm run plan:finalize -- <plan-file> "<codex approval summary>"`
- Diff critique:
  - `npm run gemini:collab:diff -- <paths...>`
- Screenshot critique:
  - `npm run gemini:collab:screenshot -- <image-path> "<context>"`
- Failure triage:
  - `npm run gemini:collab:triage -- <command>`

## Workflow

### 1) Confirm the plan state

- If no concrete plan exists yet, use a planning skill first:
  - `$nontechnical-intake-to-plan`
  - `$prd-to-build-plan`
  - `$phase-planning-red-team`
- Do not use this skill as the plan generator.

### 2) Gather repo evidence before asking Gemini

- Read the smallest relevant docs and files first.
- Run targeted `rg` searches for existing patterns.
- Pass only the needed scope to Gemini commands.

### 3) Use the strongest repo-native gate by default

- If the plan file will gate implementation, prefer:
  - `npm run plan:finalize -- <plan-file> "<summary>"`
- Use `plan:review` only when review metadata/artifacts are needed without final approval.
- Use `gemini:collab:plan` for ad hoc text critique, not for implementation gating.

### 4) Interpret Gemini output explicitly

After Gemini responds, Codex should classify findings as:

- `Adopted`
- `Deferred`
- `Rejected`

Then update the plan, notes, or implementation sequence accordingly before coding.

### 5) Use Gemini again at review gates when helpful

- For implementation changes, use `gemini:collab:diff` on the touched paths.
- For UI work, use `gemini:collab:screenshot` or screenshot gates after artifacts exist.
- Run these before the final repo validation flow, not instead of it.

## Safety Rules

- Never paste secrets, `.env` values, tokens, or private credentials into prompts.
- Do not treat Gemini as a replacement for the required Codex reviewer role on `MED/HIGH` work.
- If Gemini auth or model access fails, report the exact command and exact error.
- Only fall back to raw `gemini` CLI usage if the repo wrappers are broken and there is a clear reason to bypass them.
