## 2024-05-24 - Resolving N+1 Network Latency
**Learning:** Sequential network calls within loops (e.g., in `deletarNaoConfirmadas`) cause significant latency.
**Action:** Utilized `p-limit` with a concurrency factor of 20 and `Promise.all` to batch requests and safely parallelize without overloading the external API.
