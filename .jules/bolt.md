## 2024-05-22 - Fix eslint config and image optimization

**Learning:** `integra-front/eslint.config.mjs` is an ES module and must use `export default`; it cannot use `module.exports`. Configuration intended for Next.js (like `output` or `images`) belongs in `next.config.ts`, not the ESLint config file. Including `module.exports` breaks the linting process (`module is not defined`).
**Action:** When configuring ESLint in ES modules, always use `export default`. Ensure Next.js config stays in `next.config.ts`.

**Learning:** `pnpm build` in `integra-front` enforces strict linting, including checks for `<img>` tags (prefer `next/image`), `<a>` tags for navigation (prefer `Link`), and `no-unescaped-entities`.
**Action:** Always run `pnpm lint` before attempting to build. Use `next/image` for images and `next/link` for internal navigation.

**Learning:** `SidebarMenu` is a heavy component used in many pages. Wrapping it in `React.memo` helps prevent unnecessary re-renders when parent state changes (like opening/closing the sidebar), provided props are stable or the component is computationally expensive enough to justify the comparison check.
**Action:** Consider `React.memo` for layout components that are re-rendered frequently by parent state changes.
