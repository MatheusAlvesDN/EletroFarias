## 2024-05-23 - Mixed Configuration in ESLint Config
**Learning:** The `integra-front` project had Next.js configuration (`nextConfig`) and `module.exports` incorrectly placed inside `eslint.config.mjs`. This caused build failures ("module is not defined") and prevented Next.js configuration (like image optimization settings) from being applied correctly.
**Action:** Always verify `eslint.config.mjs` contains only ESLint configuration and uses ESM syntax. Next.js configuration must be in `next.config.ts` or `next.config.js`.
