## 2025-05-01 - p-limit compatibility in NestJS
**Learning:** Using `p-limit` in the NestJS backend (which uses CommonJS) causes `ERR_REQUIRE_ESM` crashes.
**Action:** Use native custom chunking with `Promise.all` to manage concurrency instead.
