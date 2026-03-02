## 2024-05-18 - [Fix N+1 query problem with concurrent chunking]
**Learning:** Sequential `await` in loops like `for (const r of rows)` when saving data to the database can cause an N+1 query problem, exhausting the connection pool and significantly increasing latency, especially with large datasets.
**Action:** Replace sequential `await` loops with concurrent chunked execution using a helper like `processInChunks` with `Promise.all` to parallelize queries while controlling the concurrency limit.
