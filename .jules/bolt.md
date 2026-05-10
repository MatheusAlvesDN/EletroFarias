## 2024-05-10 - Parallelize Database Writes
**Learning:** Sequential `await` in loops for database writes (like in `synccurvaProdutoProdutos`) creates significant bottlenecks when processing many rows.
**Action:** Use chunked `Promise.all` processing (with a standard batch size of 20) to manage concurrency for independent I/O tasks. Note: do not use the `p-limit` package in NestJS backend despite its presence in `package.json`, as importing modern versions of it in the CommonJS NestJS causes `ERR_REQUIRE_ESM` crashes. Always use native array chunking for concurrency control.
