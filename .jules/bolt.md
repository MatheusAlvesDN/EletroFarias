## 2025-02-18 - Promise.all Batching
**Learning:** Sequential network calls inside a synchronous for-loop drastically reduce execution time by suffering from N+1 network latency. Replacing a sequential await loop with batched concurrent chunks using `Promise.all` achieves massive speedups without overwhelming external API limits.
**Action:** When finding loops dealing with API requests, consider breaking them into chunks and executing via `Promise.all` to limit concurrency but improve speed. Always remember to write a comment explaining the performance optimizations when implementing changes.
