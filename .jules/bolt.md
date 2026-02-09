## 2026-02-09 - Fidelimax Integration Bottleneck
**Learning:** `pontuarNotasNaFidelimax` fetches ALL consumers via `listarTodosConsumidores` on every run, leading to O(N) API calls where N is total consumers (paginated).
**Action:** Investigate using `RetornaDadosCliente` for existence check or implement local caching of consumer IDs to avoid full fetch.

## 2026-02-09 - Next.js Config in ESLint Config
**Learning:** `integra-front/eslint.config.mjs` incorrectly contained Next.js configuration mixed with ESLint config using invalid syntax. This blocked builds and hid intended performance settings like `output: 'export'`.
**Action:** Verify `next.config.ts` vs `eslint.config.mjs` when debugging build errors or missing Next.js optimizations.
