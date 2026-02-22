## 2024-05-23 - Sidebar Navigation Accessibility & ESLint Config
**Learning:** Found critical accessibility gaps in SidebarMenu: missing `aria-expanded`, `aria-controls`, and `nav` role. Also discovered invalid `module.exports` in `eslint.config.mjs` causing lint failures.
**Action:** Always verify `eslint.config.mjs` for ESM compatibility. Ensure collapsible menus use ARIA attributes and `next/link` for navigation items.
