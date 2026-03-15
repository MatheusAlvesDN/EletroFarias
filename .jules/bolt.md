
## 2025-03-15 - [Database Latency Optimization in Loops]
**Learning:** Found sequential `await` loops inside Prisma database synchronization routines (like `synccurvaProdutoProdutos`) causing N+1 latency issues where each operation waited for the previous to complete before starting.
**Action:** Next time, replace sequential `await` loops with chunked `Promise.all` arrays (e.g., chunks of 50) when performing independent database write operations (like `upsert` or `updateMany`) to significantly reduce total network latency while protecting the database connection pool.
