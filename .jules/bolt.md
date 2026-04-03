## 2024-04-03 - N+1 API Calls with sequential await
**Learning:** When processing independent database/API operations (like 'inFidelimaxNoteCheck') in loops, using sequential `await` introduces massive N+1 latency.
**Action:** Use custom array chunking with `Promise.all` (e.g., chunks of 50) rather than sequential `await` calls. This prevents N+1 latency issues and speeds up synchronization while protecting the database connection pool. Never use ESM packages like `p-limit` as this codebase is CommonJS.
