## 2024-05-04 - Optimize sequential external API calls in deletarNaoConfirmadas
**Learning:** Sequential external API calls without concurrency cause significant N+1 network latency delays. Using external ESM dependencies for concurrency like p-limit causes ERR_REQUIRE_ESM crashes in NestJS (CommonJS by default).
**Action:** Use native custom chunking with Promise.all for batching operations (e.g., in chunks of 20). This mitigates N+1 latency while keeping memory usage controlled and maintaining compatibility with NestJS.
