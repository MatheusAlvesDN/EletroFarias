## 2024-05-12 - CommonJS ESM crash with p-limit
**Learning:** Although `p-limit` is in `package.json`, using it in the NestJS backend (which runs CommonJS) causes an `ERR_REQUIRE_ESM` crash.
**Action:** Use native custom chunking with `Promise.all` (e.g., standard batch size of 20) to manage concurrency for independent I/O tasks like Prisma database updates.
