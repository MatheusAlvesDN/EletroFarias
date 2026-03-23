## 2024-10-24 - Promise.all Chunking for DB Upserts
**Learning:** Sequential await loops for independent database upserts cause severe N+1 latency bottlenecks, but unbounded Promise.all can exhaust the Prisma connection pool.
**Action:** Always process independent database write operations (like upserts) in loops using chunked Promise.all arrays (e.g., chunks of 50) rather than sequential await calls.
