## 2024-05-09 - Node.js Concurrent I/O Limits with CommonJS
**Learning:** In the NestJS backend, importing modern ESM packages like `p-limit` causes `ERR_REQUIRE_ESM` crashes because the app uses CommonJS. Attempting to process unbound arrays with `Promise.all` for heavy I/O tasks (like image downloads/uploads) causes memory spikes and socket timeouts.
**Action:** Use native custom chunking with a standard batch size of 20 and a `for` loop over array slices to manage concurrency for independent I/O tasks instead of external ESM libraries.
