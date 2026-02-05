## 2024-05-22 - Unsafe React.memo Optimization
**Learning:** Using `React.memo` with a custom comparator that ignores function props (like `onClose`) creates stale closures if the parent passes dynamic callbacks. This breaks functionality when the callback depends on changing state.
**Action:** Always verify parent callback stability before using custom comparators. Prefer standard `React.memo` combined with `useCallback` in the parent for safe optimization.
