# Palette's Journal

## 2025-05-23 - Accessibility Contrast and Inline Styles

**Learning:** Bright cyan (#0FF) used as a background for white text fails WCAG contrast standards (1.25:1) and creates a "vibrating" effect that is hard to read.
**Action:** When using brand colors like Cyan for buttons, darken the background to at least `cyan-700` when using white text, or use `slate-900` text if using the bright `cyan-400` background. Always prefer Tailwind classes over inline styles for consistency and maintainability.
