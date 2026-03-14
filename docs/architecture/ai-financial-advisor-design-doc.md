# AI Financial Advisor - Product + UI Design Doc v0.6

**Last updated:** 2026-03-08

---

## How to use this doc

- This is the canonical product/design intent doc for product vision, UX principles, and system/experience direction.
- Companion execution planning lives in `docs/PRODUCT_PLAN.md`.
- If milestone order, delivery status, or current implementation scope conflicts with this doc, `docs/PRODUCT_PLAN.md` wins for day-to-day execution.
- When this doc changes in ways that affect active scope, acceptance criteria, or milestone sequencing, update `docs/PRODUCT_PLAN.md` in the same slice.

## 1  Product vision

A mobile‑first personal‑finance copilot that delivers the clarity of a human advisor with the speed and availability of AI. It helps users understand their money at a glance, build healthier habits, and progress along a clear Financial‑Maturity Roadmap—without jargon or intimidation.

## 2  Design principles

1. **Trust by Transparency** – always expose the math or data source.
2. **One‑Glance Clarity** – critical numbers readable in ≤3 s; TTI budget 300 ms.
3. **Guidance, not prescriptions** – recommendations framed as pros/cons; second‑person copy.
4. **Inclusive & Accessible** – WCAG 2.2 AA, dark/light themes, RTL‑ready.
5. **Performance by Design** – < 75 KB JS per screen; all animations GPU‑accelerated.

## 3  UI Tech Stack (Current)

• **Expo managed workflow**
  – Zero-config builds, OTA, fast refresh.
• **TypeScript**
  – Safety and IDE tooling.
• **NativeWind + reusable primitives/components**
  – Utility-first styling plus repo-owned building blocks for consistent screens.
• **expo-router**
  – File-based navigation with almost zero glue code.
• **Zustand + TanStack Query**
  – Lightweight state + rock-solid data fetching/caching.
• **Theme tokens + compatibility bridge**
  – Shared tokens live in `theme/tokens.ts`, with `theme/paper.ts` kept as a compatibility layer where needed.

## 4  Design system

### 4.1  Colour tokens

| Token           | Hex         | Use                      |
| --------------- | ----------- | ------------------------ |
| `brand/500`     | **#163F7A** | Primary buttons, links   |
| `brand/900`     | #0B1C3D     | Headers, app bar         |
| `accent/500`    | #2E7BEF     | Charts, focuses          |
| `gold/500`      | **#D4AF7F** | Highlight, progress ring |
| `gold/300`      | #F0D9B5     | Hover, subtle fills      |
| `gold/700`      | #9E7C4B     | Dark mode gold           |
| `surface/light` | #F9FAFB     | Light backgrounds        |
| `surface/dark`  | #111827     | Dark backgrounds         |
| `text/light`    | #1A1A1A     | Body copy on light       |
| `text/dark`     | #F3F4F6     | Body copy on dark        |
| `border`        | #C7CBD2     | Dividers, outlines       |
| `success/500`   | #10B981     | Positive trend           |
| `error/500`     | #EF4444     | Errors, warnings         |
| `text/dark`     | #F3F4F6     | Body copy on dark        |
| `border`        | #C7CBD2     | Dividers, outlines       |
| `success/500`   | #10B981     | Positive trend           |
| `error/500`     | #EF4444     | Errors, warnings         |

All colour combinations pass WCAG AA contrast.

### 4.2  Typography tokens

| Token | Font | Size / Line | Notes |
| Token | Font | Size / Line | Notes |
| ... | ... | ... | ... |

### Tab Structure

- Home
- Accounts
- Goals
- Insights
- Profile

### Color Palette

- Primary: `#163F7A`
- Accent: `#D4AF7F`

```json
{
  "brand500": "#163F7A",
  "brand700": "#102850",
  "gold500": "#D4AF7F",
  "surfaceLight": "#F9FAFB",
  "surfaceDark": "#111827",
  "surfaceMutedLight": "#E7ECF3",
  "surfaceMutedDark": "#1F2937",
  "textLight": "#1A1A1A",
  "textLightMuted": "#4B5563",
  "textDark": "#F3F4F6",
  "textDarkMuted": "#CBD5F5",
  "success500": "#10B981",
  "error500": "#EF4444",
  "warning500": "#FFB020",
  "info500": "#2F80ED",
  "border": "#C7CBD2"
}
```

### Spacing & Radii Tokens

```
space: { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, xxl: 40 }
radius: { xs: 6, sm: 10, md: 14, lg: 20, xl: 28 }
```

### Typography Tokens

```
type: {
  h1: { size: 28, weight: '700', lh: 34 },
  h2: { size: 22, weight: '700', lh: 28 },
  numXL: { size: 32, weight: '700', lh: 36, tabular: true },
  num: { size: 18, weight: '600', lh: 22, tabular: true },
  body: { size: 15, weight: '500', lh: 20 },
  meta: { size: 12, weight: '500', lh: 16 }
}
```

Tabular numerals are enabled (`fontVariant: ['tabular-nums']`) for all monetary components to ensure alignment and legibility.

**_ End_**
