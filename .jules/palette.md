## 2025-02-23 - [Navigation UX: Imperative vs Declarative]
**Learning:** Navigation menus built with imperative `router.push()` (e.g., via `onClick`) lack native browser features like opening in a new tab (Ctrl+Click), status bar URL preview, and proper accessibility semantics. This significantly degrades the user experience for power users and those relying on assistive technology.
**Action:** Always prefer using `next/link` via the `component={Link}` prop on Material UI components (like `Button` or `ListItemButton`) to combine visual consistency with native web navigation behaviors.
