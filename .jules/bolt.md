## 2024-04-28 - ESM Restrictions in NestJS Concurrency
**Learning:** Using modern ESM concurrency libraries like `p-limit` in the NestJS backend (which runs on CommonJS) causes `ERR_REQUIRE_ESM` crashes, even if they are in package.json.
**Action:** Use native custom chunking with `Promise.all` to manage concurrency and prevent N+1 API bottlenecks.