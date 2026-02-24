# Palette's Journal

## 2026-02-24 - Collapsible Menu Accessibility
**Learning:** Collapsible sidebar menus using MUI `Button` + `Collapse` lacked proper ARIA attributes, making state invisible to screen readers.
**Action:** When implementing accordions/collapsibles, always add `aria-expanded`, `aria-controls`, and ensure the content region has a corresponding `id` and `role="region"`.
