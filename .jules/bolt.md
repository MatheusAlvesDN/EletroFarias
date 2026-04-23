## 2024-04-23 - Batching External API Calls in NestJS
**Learning:** External API batching with `p-limit` causes `ERR_REQUIRE_ESM` crashes in the NestJS backend since it uses CommonJS by default.
**Action:** Use native array chunking combined with `Promise.all` to manage concurrency safely when reducing N+1 network latency in NestJS.