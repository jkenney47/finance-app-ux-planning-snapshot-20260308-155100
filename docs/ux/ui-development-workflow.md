# UI Development Workflow (AI-Only + Simulator/Xcode + Maestro)

Use this workflow whenever any UI is changed.
Default path is artifact-first and fully code/simulator-driven.

## What Each Tool Is For

### Codex + Xcode + Simulator + Maestro

Use this stack to implement and validate real UI behavior.

- Required for all UI changes.
- Primary value: native behavior, deterministic flow checks, and reviewable screenshot artifacts.

## Source Of Truth

- Token values: `theme/tokens.ts` is canonical.
- iOS runtime: final truth for behavior and accessibility.
- Screenshot packet in `artifacts/ui-review/<timestamp>/`: final review artifact.

## Required Automated Flow

1. Finalize active plan metadata:

```bash
npm run plan:finalize -- docs/PRODUCT_PLAN.md "Codex approval summary"
```

2. Run repo completion gate:

```bash
npm run validate
```

3. Run UI artifact pipeline:

```bash
npm run ui:review
```

`ui:review` runs:

- Maestro flow matrix (mock-first flags)
- simulator screenshot capture matrix (small/large phone + tablet, light/dark, default/max text)

## Strict iOS Validation (Required)

Validate the UI in iOS Simulator with all of the following:

- Device coverage: small iPhone, large iPhone, and iPad.
- Dynamic Type: max accessibility text size.
- Appearance: light and dark.
- States: Loading, Empty, Error, Offline/Degraded (if relevant to the screen).

If simulator/Xcode build binding is flaky, run:

```bash
npm run xcode:stabilize
```

## Review Evidence (Required)

Review from the generated packet:

- `artifacts/ui-review/<timestamp>/report.md`
- `artifacts/ui-review/<timestamp>/summary.json`
- `artifacts/ui-review/<timestamp>/screenshots/`

## Completion Gate

Before reporting completion:

```bash
npm run validate
```
