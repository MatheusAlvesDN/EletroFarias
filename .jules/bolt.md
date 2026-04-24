## 2026-04-24 - Avoid p-limit in NestJS CommonJS
**Learning:** Although `p-limit` is in `package.json`, importing modern versions of it in the NestJS backend (which uses CommonJS by default) causes `ERR_REQUIRE_ESM` crashes.
**Action:** Use native custom chunking with `Promise.all` to manage concurrency instead.
