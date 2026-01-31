## 2025-02-23 - Frontend Re-rendering
**Learning:** `SidebarMenu` is a heavy component (Drawer) used in interactive pages. Passing unstable callbacks (e.g. `() => setOpen(false)`) causes full re-renders of the menu on every state change (like typing).
**Action:** Always wrap `SidebarMenu` (or similar heavy layout components) in `React.memo` and use `useCallback` for its event handlers in the parent.

## 2025-02-23 - Legacy Linting Config
**Learning:** `integra-front/eslint.config.mjs` contained invalid `module.exports` alongside ESM syntax, breaking `next lint`.
**Action:** Ensure configuration files respect their module type (.mjs = ESM).
