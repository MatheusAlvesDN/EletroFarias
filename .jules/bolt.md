## 2024-05-21 - Mixed Module Systems in Config
**Learning:** `eslint.config.mjs` was using `module.exports` (CommonJS) alongside `export default` (ESM), causing lint failures.
**Action:** When fixing tooling, check for mixed module systems in `.mjs` files.
