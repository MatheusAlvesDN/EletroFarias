## 2024-05-07 - Mitigate N+1 issue in sync.service.ts
**Learning:** Found sequential await inside a for loop in `deletarNaoConfirmadas` which causes N+1 network requests latency. The memory instructs to optimize this by chunking.
**Action:** Replace sequential await with Promise.all batched requests in chunks of 20 to improve performance without overwhelming the target.
