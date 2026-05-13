## 2024-05-13 - NestJS CommonJS and p-limit concurrency
**Learning:** Modern versions of `p-limit` cause `ERR_REQUIRE_ESM` crashes in this NestJS backend because it uses CommonJS by default.
**Action:** Use native custom chunking with `Promise.all` (standard batch size of 20) to manage concurrency for independent I/O tasks instead.
