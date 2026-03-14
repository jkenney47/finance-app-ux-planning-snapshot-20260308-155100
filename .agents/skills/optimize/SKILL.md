---
name: optimize
description: Improve interface performance across loading speed, rendering efficiency, animation smoothness, image delivery, and bundle size. Use when asked to speed up a page, route, component, or feature and deliver measurable before/after performance gains without breaking UX or accessibility.
---

# Optimize

## Goal

Identify and fix the highest-impact performance bottlenecks to produce faster, smoother user experiences.

## Input

- `target` (optional): page, route, component set, or feature to optimize.
- If `target` is omitted, optimize the most relevant surface in the request.

## Assess Performance Issues

Measure current behavior first, then optimize.

### 1) Measure Current State

Capture baseline metrics:

- Core Web Vitals: `LCP`, `FID/INP`, `CLS`.
- Load performance: `FCP`, `TTI`, and perceived interactivity.
- Bundle profile: JavaScript, CSS, and image payload sizes.
- Runtime behavior: frame rate, memory, CPU pressure.
- Network profile: request count, payload sizes, waterfall.

### 2) Identify Bottlenecks

Determine:

- what is slow (load, interaction, animation, scroll, route transition)
- why it is slow (large assets, expensive JavaScript, layout thrashing, over-rendering)
- user impact severity (minor, annoying, blocking)
- affected cohorts (mobile, low-end devices, slow networks, all users)

Optimization without measurement is not acceptable.

## Optimization Strategy

Prioritize highest-impact issues first.

### Loading Performance

#### Images

- Use modern formats (`WebP`, `AVIF`) where supported.
- Serve correctly sized responsive assets.
- Lazy load below-the-fold images.
- Compress aggressively within visual quality tolerance.
- Use CDN delivery for static media.

```html
<img
  src="hero.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  loading="lazy"
  alt="Hero image"
/>
```

#### JavaScript Bundle

- Code split by route and heavyweight component boundaries.
- Remove unused dependencies and dead imports.
- Use tree shaking and dynamic imports for optional code paths.

```javascript
const HeavyChart = lazy(() => import("./HeavyChart"));
```

#### CSS and Fonts

- Remove unused CSS.
- Prioritize critical CSS and defer non-critical styles.
- Minimize font payload (subset glyphs, limit weights, preload critical fonts).
- Prefer `font-display: swap` or `optional`.

```css
@font-face {
  font-family: "CustomFont";
  src: url("/fonts/custom.woff2") format("woff2");
  font-display: swap;
  unicode-range: U+0020-007F;
}
```

#### Loading Strategy

- Prioritize critical assets.
- Use `async`/`defer` for non-blocking scripts.
- Preload must-have resources and prefetch likely next navigations.
- Leverage caching/service workers where architecture supports it.

### Rendering Performance

#### Avoid Layout Thrashing

```javascript
// Bad: interleaved reads/writes
elements.forEach((el) => {
  const height = el.offsetHeight;
  el.style.height = `${height * 2}px`;
});

// Good: batch reads, then writes
const heights = elements.map((el) => el.offsetHeight);
elements.forEach((el, i) => {
  el.style.height = `${heights[i] * 2}px`;
});
```

#### Reduce Render/Paint Cost

- Flatten deep DOM structures where possible.
- Use `content-visibility: auto` for long-content regions.
- Virtualize very long lists.
- Prefer animating `transform` and `opacity` over layout-affecting properties.
- Use `will-change` sparingly and remove it when not needed.

### Animation Performance

Target smooth 60fps motion.

- Keep frame budget near 16ms.
- Prefer CSS animations or `requestAnimationFrame` for JS-driven motion.
- Debounce/throttle high-frequency events.
- Use GPU-friendly properties.

```css
/* Preferred */
.animated {
  transform: translateX(100px);
  opacity: 0.5;
}
```

Use `IntersectionObserver` for viewport-triggered effects and lazy behavior.

### Framework Optimization (React and General)

- Use `memo`, `useMemo`, `useCallback` where they reduce measurable work.
- Minimize unnecessary re-renders.
- Avoid expensive inline computation during render.
- Split heavy routes/components and lazy load.
- Use profiler tooling before and after each change.

### Network Optimization

- Reduce request count and third-party overhead.
- Compress responses (`brotli`/`gzip`) and set caching headers.
- Use pagination and field-level query minimization.
- Optimize for poor connections with progressive loading.

## Core Web Vitals Targets

- `LCP < 2.5s`: optimize hero render path, critical assets, and server/CDN delivery.
- `FID < 100ms` or `INP < 200ms`: break long tasks, defer non-critical JS, offload heavy work.
- `CLS < 0.1`: reserve layout space, set explicit dimensions/aspect ratio, avoid unstable insertion.

```css
.image-container {
  aspect-ratio: 16 / 9;
}
```

## Performance Monitoring

Use multiple data sources:

- Chrome DevTools (Lighthouse, Performance panel)
- WebPageTest
- Core Web Vitals / CrUX
- bundle analyzers
- RUM/APM tools (for example Sentry, DataDog, New Relic)

Track:

- `LCP`, `FID/INP`, `CLS`
- `FCP`, `TTI`, `TBT`
- bundle size
- request count and payload

Measure on representative devices and network conditions, not only desktop fast-path.

## Verify Improvements

Confirm measurable gains and no regressions:

- compare before/after Lighthouse and profiler traces
- validate improvements with real-user monitoring where available
- test low-end Android and constrained networks (for example 3G throttling)
- verify behavior, accessibility, and functionality remain intact
- validate perceived speed, not only synthetic metrics

## Non-Negotiables

- Do not optimize without baseline measurement.
- Do not sacrifice accessibility for speed.
- Do not break user-facing behavior while optimizing internals.
- Do not apply `will-change` indiscriminately.
- Do not lazy load above-the-fold critical content.
- Do not chase micro-optimizations before fixing major bottlenecks.
- Do not ignore mobile and slow-network performance.
