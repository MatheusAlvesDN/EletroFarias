## 2025-02-18 - Legacy Inline Styles Violating A11y
**Learning:** Found critical accessibility violations (contrast ratio < 1.25:1) in key navigation elements implemented with inline styles, bypassing the project's Tailwind design system.
**Action:** Audit components for `style={{...}}` usage to identify and refactor legacy UI elements that likely fail accessibility standards.
