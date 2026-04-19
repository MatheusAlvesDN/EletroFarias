## 2025-02-18 - Avoid ESM imports for custom concurrency in NestJS
**Learning:** Although 'p-limit' is listed in the 'integra-ifood' package.json, importing modern versions of it in the NestJS backend (which uses CommonJS by default) causes 'ERR_REQUIRE_ESM' crashes.
**Action:** Use native custom chunking with 'Promise.all' to manage concurrency instead.
