## 2024-05-18 - [Backend - Sequential N+1 Requests]
**Learning:** `getPrecosProdutosTabelaBatch` iterates synchronously with `for...of` sending individual HTTP requests for every product, resulting in N+1 requests where they could be batched or processed concurrently.
**Action:** Replace `for...of` loops iterating with `await` with an implementation utilizing `Promise.all` with concurrency control via custom chunking (since `p-limit` has CJS/ESM issues in this NestJS codebase, as per previous learnings).
