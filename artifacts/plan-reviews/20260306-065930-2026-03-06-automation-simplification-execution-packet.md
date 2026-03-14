# Gemini Plan Review

- Plan: `docs/plans/2026-03-06-automation-simplification-execution-packet.md`
- Generated-At-UTC: 2026-03-06T11:59:30Z
- Model: gemini-3.1-pro-preview

MCP issues detected. Run /mcp list for status.Here is a senior review of the proposed "Automation Simplification + Quality Gate Alignment" plan:

### 1. P0/P1/P2 Risks
*   **P0 (Critical): Branch Protection Rule Breakage.** If `lint.yml` becomes the *single* explicit PR quality check and other workflows are disabled or renamed, PRs may become un-mergeable if GitHub branch protection settings still require the old status checks.
*   **P1 (High): Loss of Security/Dependency Updates.** If `pr-autopilot` previously handled Dependencyabot or Snyk PRs autonomously, disabling passive triggers will cause these to pile up silently unless an alternative manual workflow is defined.
*   **P2 (Medium): Documentation Drift.** Updating five separate policy documents (`AI_RULES.md`, `CODEX.md`, `agent-orchestration.md`, `quality-gates.md`, `rules.md`) simultaneously is highly error-prone and guarantees future drift. 

### 2. Missing Steps or Hidden Dependencies
*   **GitHub Settings Update:** The plan misses the manual step of updating repository settings (Branch Protection Rules) to require the exact new `Quality Checks` job name.
*   **Action Context Mapping:** Modifying `ci-auto-heal.yml` to `workflow_dispatch` requires explicitly defining inputs (e.g., `run_id` or `job_id`). The plan misses how these new inputs will be passed down to `scripts/ci-auto-heal.mjs`.
*   **Infinite Loop Prevention:** If `issue-escalation.mjs` still runs on `issue_comment`, the plan must explicitly specify filtering out bot/github-actions comments to prevent infinite comment-trigger loops.

### 3. Frontend State Coverage
*   *N/A per scope:* No product surfaces are being modified. However, be aware that disabling `ci-auto-heal` means flaky UI integration tests will now hard-fail on PRs, potentially reducing developer velocity.

### 4. Accessibility Risks
*   *N/A per scope:* No UI changes are introduced in this slice.

### 5. Concrete Tests to Add or Run
*   **Dry-Run Script Tests:** Add unit tests for `pr-autopilot.mjs` and `issue-escalation.mjs` specifically asserting that they immediately exit (`process.exit(0)`) if the payload does not contain the exact `/pr-autopilot` or `/auto-remediate` strings.
*   **Workflow Syntax Validation:** `node --check` only verifies JavaScript syntax. You must use `actionlint` (or similar) to validate the modified GitHub Actions `.yml` files before committing.
*   **Full Suite Verification:** The validation steps list `npm run validate`, but you must explicitly ensure this encompasses unit tests, type-checking (`tsc`), and linting (`eslint`), as it will become the single gate.

### 6. Simpler Alternatives
*   **YML-Level Enforcement (Avoid Script Bloat):** Instead of adding defensive logic inside the `.mjs` scripts to check for specific comment strings or schedule contexts, handle this entirely in the `.yml` files using GitHub Actions `if:` conditionals (e.g., `if: contains(github.event.comment.body, '/pr-autopilot')`). This keeps the scripts dumb and the trigger logic visible in the YAML.
*   **Consolidate Policy Docs:** Instead of updating five documents with the same explicit-trigger policy, write the policy once in `docs/operations/agent-orchestration.md` and replace the relevant sections in `AI_RULES.md`, `CODEX.md`, and `rules.md` with a direct link to the canonical file.
