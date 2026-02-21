## 2025-02-18 - Legacy Code Patterns
**Learning:** Found multiple instances of inline styles and `<a>` tags for internal navigation in `src/app` pages, bypassing Next.js optimization and Tailwind consistency.
**Action:** When touching these files, prioritize converting to `next/link` and Tailwind utility classes.

**Learning:** `eslint.config.mjs` was misconfigured to export Next.js config via `module.exports`, causing build failures in strict ESM environments.
**Action:** Verify config files are using correct module syntax (ESM vs CJS) when debugging build issues.
