## 2026-04-14 - Optimizing API Sequential Calls
**Learning:** Using third-party concurrency control modules like `p-limit` in a mixed CJS/ESM environment can cause difficult module resolution errors. To avoid runtime issues, implementing a native Promise chunking function is a safer, zero-dependency alternative to process arrays concurrently without exhausting I/O limits.
**Action:** Default to creating lightweight helper functions (like `processNotesInChunks`) for parallel batch processing over adding new external concurrency libraries.
