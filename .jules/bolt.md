## 2024-04-20 - N+1 Issue in deletarNaoConfirmadas
**Learning:** Found sequential unbatched API calls inside a loop in `SyncService.deletarNaoConfirmadas` which can cause N+1 query patterns. Wait times are completely sequential. Also, avoiding external modules like `p-limit` in Next.js/NestJS integrations is important per memory because it can crash the app with ES modules errors (`ERR_REQUIRE_ESM`).
**Action:** Replace `for...of` loop waiting sequentially with `Promise.all` inside chunks to parallelize the requests efficiently using custom chunks natively with `Array.slice`.
