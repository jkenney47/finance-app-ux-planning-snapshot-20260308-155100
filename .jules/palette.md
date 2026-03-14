## 2026-03-07 - Cross-Platform Accessibility Role

**Learning:** When building cross-platform interactive components in React Native (e.g., using Pressable), relying solely on HTML role mapping is insufficient for full native support.
**Action:** Always explicitly provide both role (for web/React Native web) and accessibilityRole (for native iOS/Android) to ensure correct screen reader announcements across all platforms.
