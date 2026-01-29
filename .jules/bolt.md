## 2026-01-29 - Global Sidebar Re-renders
**Learning:** The `SidebarMenu` component is used in almost every page and was not memoized. Any state update in the parent page (like typing in a search field) caused the entire sidebar to re-render. Since the sidebar has complex logic (JWT parsing, role filtering), this is a significant performance drain.
**Action:** Always wrap global layout components like Sidebar/Header in `React.memo` and ensure parents pass stable callbacks (using `useCallback`) for event handlers like `onClose`.
