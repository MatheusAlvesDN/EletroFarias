## 2025-02-12 - N+1 Optimization in SyncService
**Learning:** The `synccurvaProdutoProdutos` method was performing sequential database upserts for potentially thousands of products (N+1 problem). This is a common pattern in sync tasks.
**Action:** Implemented a `processInChunks` helper to batch these operations using `Promise.all` with a concurrency limit (e.g., 50). This improves throughput while protecting the database connection pool. Future sync tasks should use this pattern.
