## 2024-05-11 - P-limit ESM Crash Pattern
**Learning:** Using `p-limit` for concurrency in the NestJS backend (which uses CommonJS) causes `ERR_REQUIRE_ESM` crashes.
**Action:** Use native custom chunking with `Promise.all` (standard batch size of 20) to manage concurrency for independent I/O tasks instead.
