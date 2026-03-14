## 2024-03-01 - [Refactoring Overly Complex Return Types]

**Learning:** Returning large, inline union types directly from a function signature significantly degrades readability and maintainability.
**Action:** Always extract complex, inline return types into distinctly named `type` aliases. When returning `as const` object literals, ensure the extracted type explicitly matches the literal permutations to preserve strict type safety without relying on implicit inference, which can inadvertently widen the allowed object shapes.

## 2024-05-19 - Avoid array spreading in reduce

**Learning:** In React Native apps (especially data-heavy ones like financial apps), using the spread operator `[...groups, newGroup]` inside a `reduce` loop creates unnecessary allocations per item and yields O(N^2) complexity where O(N) is easily achievable. This leads to slow execution and garbage collection hiccups.
**Action:** When grouping arrays (like in `app/(dashboard)/accounts.tsx`), mutate the accumulator array with `.push()` and return it, or use a Map internally, instead of spreading `...groups` repeatedly on each iteration.
