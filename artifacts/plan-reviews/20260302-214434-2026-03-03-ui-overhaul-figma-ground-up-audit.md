# Gemini Plan Review

- Plan: `docs/plans/2026-03-03-ui-overhaul-figma-ground-up-audit.md`
- Generated-At-UTC: 2026-03-03T02:44:34Z
- Model: gemini-3.1-pro-preview

Prompts updated for server: MCP_DOCKERTools updated for server: MCP_DOCKERHere is a senior review of the proposed Phase 0.5 Implementation Plan:

### 1. Risks (P0/P1/P2)
*   **P0: Reverse-Engineering to Figma (Step B):** Relying on a Web-to-Figma MCP capture flow for a React Native/Expo app is highly risky. These tools often fail to capture CSS-in-JS/NativeWind layouts accurately. Generating a Figma file from code is likely to produce a broken artifact that creates confusion rather than a reliable baseline.
*   **P1: Massive Diff Review (Step E):** Running `npm run gemini:collab:diff` across `app components utils stores theme docs scripts maestro` simultaneously will overwhelm the context window, leading to missed regressions or hallucinations. Reviews must be scoped per route or component domain.
*   **P2: Data Determinism for Captures:** If the "mock-first mode" data relies on `Date.now()`, random generation, or asynchronous external mocks, the UI captures will drift. Mock data must be strictly seeded and deterministic.

### 2. Missing Steps & Hidden Dependencies
*   **Execution of Remediation:** Step D says "Record findings and fixes", but the plan lacks an explicit step for *implementing* the fixes before running the final validation in Step E.
*   **Audit Mechanism:** It is unclear *how* Step D is executed. Is it a visual audit of the screenshots, or a static code analysis of the `app/` and `components/` directories? This needs to be specified to ensure it's actionable.

### 3. Frontend State Coverage
*   **Critical Gap:** The scope only lists *routes* (Home, Profile, etc.) but completely ignores UI *states*. The audit and capture process must explicitly account for:
    *   **Loading states** (skeletons, spinners).
    *   **Empty states** (zero accounts linked, no goals set).
    *   **Error states** (validation failures, `ErrorBanner` triggers, offline mode).

### 4. Accessibility Risks
*   **Missing from Audit Matrix:** Step D outlines 7 audit criteria (tokens, semantics, etc.) but entirely omits a11y. The audit matrix MUST include:
    *   Color contrast verification (especially important if tokens are being adjusted).
    *   Minimum touch target sizes (44x44pt for iOS).
    *   Screen reader semantics (`accessibilityRole`, `accessibilityLabel`).

### 5. Concrete Tests to Add/Run
*   Run `npm run test -- -u` to update Jest snapshots if UI structures change during remediation.
*   Run existing `__tests__/components/` to ensure structural integrity hasn't regressed.
*   If Maestro is used for screenshots, add a specific flow (`maestro/flows/audit-capture.yaml`) that explicitly sets the mock states (empty, error, loaded) before capturing.

### 6. Simpler Alternatives
*   **Drop the Figma Generation:** If the assumption is "Code tokens remain source-of-truth" and the goal is to resume the existing UI roadmap, *skip Step B entirely*. Do not waste time trying to auto-generate a Figma file from the current code. Instead, rely purely on the iOS Simulator screenshots (Step C) and perform the audit (Step D) directly against those visual artifacts and the codebase. This removes the dependency on the flaky MCP web capture tool and saves significant effort.
