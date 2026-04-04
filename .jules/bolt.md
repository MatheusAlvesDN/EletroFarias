## 2024-04-04 - Promise.all Chunking to avoid N+1 queries
**Learning:** In backend data processing, using sequential `await` calls in a `for...of` loop can cause severe latency due to N+1 queries or API calls, especially when connecting to external APIs (like Sankhya/Fidelimax).
**Action:** Replace sequential `await` loops with chunked `Promise.all` processing. Avoid `p-limit` v6+ due to `ERR_REQUIRE_ESM` in NestJS/CommonJS apps. Implement an array chunking helper instead.
