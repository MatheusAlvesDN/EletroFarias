## 2024-04-02 - Chunking Database Writes
**Learning:** Sequential 'await' calls in loops for independent database operations (like 'upsert') cause severe N+1 latency. Pure ESM packages (like 'p-limit' v6+) cannot be used for concurrency control in this NestJS CommonJS app as it crashes with ERR_REQUIRE_ESM.
**Action:** Always implement custom array chunking with 'Promise.all' (e.g., chunks of 50) when 'updateMany' is not viable. This speeds up processing while preventing database connection pool exhaustion.
