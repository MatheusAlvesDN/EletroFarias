## 2025-04-06 - N+1 Query Optimization in NestJS CommonJS with Custom Chunking
**Learning:** N+1 network latency when synchronously iterating over notes in `registerClub` was discovered as a major bottleneck. However, `p-limit` cannot be used directly in NestJS applications compiled to CommonJS because it is a pure ESM package and causes `ERR_REQUIRE_ESM`.
**Action:** Implement a custom array chunking helper (`processNotesInChunks`) using `Promise.all` batches of 50 to resolve the N+1 latency directly within the service method without relying on ESM external dependencies.
