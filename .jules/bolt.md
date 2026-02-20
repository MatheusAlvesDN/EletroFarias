## 2024-05-23 - Backend Sync Parallelization
**Learning:** Sequential loops in backend sync methods (e.g., `SyncService.synccurvaProdutoProdutos`) processing large datasets are a major bottleneck. Simple concurrency helpers can provide 20x speedup.
**Action:** Identify other sequential sync loops (e.g. in `registerClub`) and apply the `runWithConcurrency` pattern.
