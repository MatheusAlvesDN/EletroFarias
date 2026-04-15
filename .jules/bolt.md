## 2024-05-20 - N+1 API Calls in Batch Operations
**Learning:** Sequential processing in batch API calls introduces severe N+1 network latency bottlenecks.
**Action:** Always batch external API interactions or use chunked `Promise.all` parallel processing (e.g., chunk size of 20) to balance concurrency limits and network throughput.
