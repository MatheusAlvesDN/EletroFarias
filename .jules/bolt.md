## 2024-04-26 - Chunked Promise.all vs ESM dependencies
**Learning:** Although 'p-limit' is listed in package.json, importing modern versions of it in the NestJS backend causes 'ERR_REQUIRE_ESM' crashes because it uses CommonJS.
**Action:** Use native custom chunking with 'Promise.all' to manage concurrency for backend sequential API optimizations instead of introducing external packages.
