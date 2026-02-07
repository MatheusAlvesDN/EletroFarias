## 2025-02-23 - React Memoization Limits with Inline Functions
**Learning:** `React.memo` on a container component (like `SidebarMenu`) is ineffective if the parent component passes unstable callback props (e.g., inline `() => setOpen(false)`).
**Action:** Instead of refactoring all parents to use `useCallback`, extract the expensive inner rendering logic (e.g., the list of items) into a separate, memoized child component (e.g., `SidebarSection`) which can receive stable props.
