## 2024-05-14 - Optimizing Prisma Operations in Loops
**Learning:** Sequential `await` calls in large loops, especially database operations like `upsert` or `update`, can cause severe N+1 latency issues and connection pool exhaustion in `integra-ifood`.
**Action:** When performing independent database write operations in loops, use custom array chunking with `Promise.all` (e.g., chunks of 50) rather than sequential `await` calls. Avoid `p-limit` v6+ due to CommonJS compilation issues.
