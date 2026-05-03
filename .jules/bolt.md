## 2025-02-12 - Missing comments on batch optimizations
**Learning:** Code reviewers expect performance optimizations (like batching API calls with `Promise.all()`) to be accompanied by a brief comment explaining the "why" (e.g., mitigating N+1 network latency).
**Action:** When implementing an optimization, ensure to add a brief, inline comment immediately preceding the optimized block explaining its performance benefit.
