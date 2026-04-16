## 2023-10-27 - Batching External API Calls mitigates N+1 Latency
**Learning:** Sequential external API calls inside loops (N+1 query problem for APIs) drastically impact performance and execution time for background jobs.
**Action:** When making multiple external API calls (e.g. canceling notes or fetching items), use `Promise.all` with a concurrency limit (e.g. `p-limit` or chunking arrays in chunks of 20) to balance external load while heavily reducing total wait time.
