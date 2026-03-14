---
name: harden
description: Improve interface resilience through robust handling of errors, edge cases, internationalization, text overflow, accessibility constraints, and real-world production conditions. Use when asked to make a screen, flow, or component robust and production-ready beyond ideal data and happy-path behavior.
---

# Harden

## Goal

Strengthen interfaces against edge cases, failures, and global usage realities that break idealized designs.

## Input

- `target` (optional): feature, flow, screen, component, or route to harden.
- If `target` is omitted, harden the most relevant interface surface from the request.

## Assess Hardening Needs

Identify weaknesses before implementing changes.

### 1) Test Extreme Inputs

- Very long text (names, titles, descriptions).
- Very short text (empty strings, one character).
- Special characters (emoji, accents, RTL text).
- Large values (millions, billions, high precision).
- Large collections (1000+ list rows, 50+ options).
- No data (empty state behavior).

### 2) Test Error Scenarios

- Network failures (offline, timeout, slow responses).
- API failures (400, 401, 403, 404, 429, 500).
- Validation and permission failures.
- Concurrent operations and race conditions.

### 3) Test Internationalization

- Text expansion (German commonly 30% longer).
- RTL layout behavior (Arabic, Hebrew).
- CJK and mixed-script rendering.
- Locale date/time/number/currency formatting.
- Pluralization and grammar rules.

Designs that only work with perfect data are not production-ready.

## Hardening Dimensions

Systematically apply resilience improvements.

### Text Overflow and Wrapping

Use explicit overflow strategies per text role.

```css
/* Single line with ellipsis */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Multi-line clamp */
.line-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Allow long-token wrapping */
.wrap {
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}
```

Prevent flex/grid overflow with `min-width: 0` and `min-height: 0` where needed.

Use fluid and readable typography:

- Prefer `clamp()` for responsive text sizing.
- Keep mobile body text at a readable minimum (typically 14px+).
- Test browser zoom/text scale up to 200%.

### Internationalization (i18n)

Handle content expansion and script variation by default.

- Budget 30-40% layout headroom for translation growth.
- Avoid fixed-width text containers.
- Use layout primitives that adapt to content.

```jsx
// Bad: fixed width assumes short English labels
<button className="w-24">Submit</button>

// Good: content-driven sizing
<button className="px-4 py-2">Submit</button>
```

Use logical CSS properties for bidi support:

```css
margin-inline-start: 1rem;
padding-inline: 1rem;
border-inline-end: 1px solid;
```

Use locale-aware formatting:

```javascript
new Intl.DateTimeFormat("en-US").format(date);
new Intl.DateTimeFormat("de-DE").format(date);

new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
}).format(1234.56);
```

Do not hardcode English pluralization. Use i18n plural rules.

### Error Handling

Create recovery-oriented states instead of dead ends.

- Show clear messages that explain what failed.
- Provide retry and fallback actions.
- Preserve user input on failure.
- Map status codes to explicit UX handling.

```jsx
{
  error && (
    <ErrorMessage>
      <p>Failed to load data. {error.message}</p>
      <button onClick={retry}>Try again</button>
    </ErrorMessage>
  );
}
```

Status-code guidance:

- `400`: show field/request correction guidance.
- `401`: guide to re-authentication.
- `403`: explain permissions and next step.
- `404`: show not-found recovery path.
- `429`: explain rate-limit wait/retry.
- `500`: show stable fallback and support path.

### Edge Cases and Boundary Conditions

Cover critical non-happy paths.

- Empty states with meaningful next actions.
- Loading states for initial, paginated, refresh, and long-running operations.
- Large dataset handling (pagination/virtualization/filtering).
- Concurrent action protection (disable repeat submit, race handling, rollback logic).
- Permission variants (view/edit/read-only states).
- Browser feature fallbacks with progressive enhancement.

### Input Validation and Sanitization

Apply defense in depth.

- Validate client-side for immediate feedback.
- Validate server-side for security and integrity.
- Enforce constraints (required, format, length, pattern).
- Sanitize and rate-limit on the backend.

```html
<input
  type="text"
  maxlength="100"
  pattern="[A-Za-z0-9]+"
  required
  aria-describedby="username-hint"
/>
<small id="username-hint">
  Letters and numbers only, up to 100 characters
</small>
```

### Accessibility Resilience

Ensure resilience for assistive and constrained interaction modes.

- Full keyboard accessibility and logical tab flow.
- Focus management in overlays/modals.
- Screen-reader announcements for dynamic changes.
- Semantic labels and meaningful alt text.
- Reduced-motion support.
- High-contrast compatibility.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Performance Resilience

Keep interfaces stable under constrained conditions.

- Optimize for slow networks (progressive loading, skeletons, offline strategy when applicable).
- Prevent memory leaks (cleanup listeners/timers/subscriptions, abort in-flight requests on unmount).
- Debounce/throttle high-frequency handlers.

```javascript
const debouncedSearch = debounce(handleSearch, 300);
const throttledScroll = throttle(handleScroll, 100);
```

## Testing Strategy

### Manual

- Long/short/empty text.
- Emoji and mixed scripts.
- RTL and CJK content.
- Offline mode and 3G throttling.
- Keyboard-only and screen-reader flows.
- Target-browser coverage.

### Automated

- Unit tests for boundary conditions.
- Integration tests for failure and retry flows.
- E2E tests for critical production paths.
- Visual regression tests.
- Accessibility scans (`axe`, `WAVE`, or equivalent).

Hardening means expecting unexpected behavior and validating recovery.

## Verify Hardening

Run explicit production-reality checks:

- 100+ character names and titles.
- Emoji in all user-facing text fields.
- Arabic/Hebrew (RTL) scenarios.
- Chinese/Japanese/Korean text scenarios.
- Offline and unstable-network scenarios.
- 1000+ item datasets.
- Rapid repeated actions (for example 10 submit clicks).
- Forced API failures across status classes.
- Fully empty data states.

## Non-Negotiables

- Do not assume perfect input.
- Do not skip i18n constraints.
- Do not emit generic, non-actionable error copy.
- Do not trust client validation alone.
- Do not use fixed widths for text-heavy UI.
- Do not block entire surfaces when one component fails.
