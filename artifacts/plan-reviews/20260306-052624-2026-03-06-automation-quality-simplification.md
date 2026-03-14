# Gemini Plan Review

- Plan: `docs/plans/2026-03-06-automation-quality-simplification.md`
- Generated-At-UTC: 2026-03-06T10:26:24Z
- Model: gemini-3.1-pro-preview

MCP issues detected. Run /mcp list for status.Here is the critique of the CI and automation simplification plan:

**1) P0/P1/P2 Risks**
*   **P1 (MTTR Degradation):** Disabling background `ci-auto-heal` means broken builds on `main` will block the pipeline until manually triaged. If alerts aren't highly visible, deployment velocity will drop.
*   **P1 (Developer Friction):** Requiring a manual `run_id` input for `ci-auto-heal.yml` via `workflow_dispatch` is a terrible UX for developers. Copy-pasting IDs across GitHub UI tabs will likely lead to the tool being abandoned in favor of local fixes.
*   **P2 (Stagnation):** Removing background PR lifecycle mutation (like auto-resolving threads or auto-merging) means developers must manually push PRs over the finish line. Ensure `jules-gatekeeper-cloud.yml` reports heavily highlight stale PRs to compensate.

**2) Missing Steps or Hidden Dependencies**
*   **Workflow Inputs:** You must explicitly define the `inputs` block under `workflow_dispatch` in `ci-auto-heal.yml` to accept the `run_id`, and update `ci-auto-heal.mjs` to read from `github.event.inputs.run_id` instead of the workflow run context payload.
*   **Permissions Audit:** If `pr-autopilot.yml` and `ci-auto-heal.yml` are dropping autonomous lifecycle mutations, verify their `permissions` blocks. You likely no longer need `contents: write` or `pull-requests: write` if they are only triggering Jules or commenting.
*   **Default Scripts:** Ensure the default values in `pr-autopilot.mjs` (like `PR_AUTOPILOT_ENABLE_PR_LIFECYCLE ?? "1"`) are actually changed to `"0"` in the code, rather than just relying on the workflow environment variables, to prevent local runs from mutating state unexpectedly.

**3) Frontend State Coverage**
*   **N/A:** This is a pure CI/CD and automation orchestration change.

**4) Accessibility Risks**
*   **N/A:** No UI components involved.

**5) Concrete Tests to Add or Run**
*   **Explicit Command Test:** Open a test PR, add an intentional failure, comment `/autopilot`, and verify the script correctly parses the explicit trigger and delegates to Jules without scanning the backlog.
*   **Manual Auto-Heal Test:** Intentionally fail a `Quality Checks` run, grab the `run_id`, and manually trigger `ci-auto-heal.yml` via the Actions UI to ensure it can successfully pull logs and create a Jules session without the standard `workflow_run` payload.
*   **Gate Validation:** Run `npm run validate && npm run check:instruction-drift` locally and introduce a synthetic failure (e.g., a type error and an ESLint violation) to guarantee these two commands definitively catch regressions.

**6) Simpler Alternatives**
*   **Alternative for `ci-auto-heal`:** Instead of a fully manual `workflow_dispatch` requiring a `run_id`, keep `ci-auto-heal.yml` triggered automatically on `workflow_run` failure. However, change its behavior to simply **open a GitHub Issue** containing the failure summary and a prompt to comment `/heal` to trigger Jules. This preserves automated discovery but enforces your new manual-approval policy for repo-writing.
