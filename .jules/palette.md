## 2025-03-05 - Enhance Collapsible Menu Accessibility
**Learning:** Collapsible sections in Next.js + MUI dashboards need explicit semantic linkage (aria-controls, aria-expanded) since visual changes aren't inherently announced to screen readers. This applies to both sidebar navigation and central dashboard actions that use expanding/collapsing lists.
**Action:** When implementing collapsible UI elements, ALWAYS map their visual toggle state to `aria-expanded` on the controlling button and establish an `id` / `aria-controls` relationship with the content being expanded.
