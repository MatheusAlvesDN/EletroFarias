## 2026-01-06 - Parallelizing API calls with Custom Concurrency
**Learning:** Sequential `for` loops making hundreds of API calls block execution significantly. Using `Promise.all` directly could overwhelm the system or external APIs due to a lack of concurrency control.
**Action:** Implemented a custom `runWithConcurrency` private helper function in `sync.service.ts` to process items in parallel while enforcing a strict concurrency limit (e.g., 20). This significantly reduces the execution time for large tasks like syncing non-scoring notes while avoiding rate limiting.
