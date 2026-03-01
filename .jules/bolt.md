# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2024-05-18 - [Optimizing synccurvaProdutoProdutos in SyncService]
**Learning:** `Promise.all` in a loop fetching chunks of a large array (like product updates) is a great pattern to speed up IO bounds tasks, and preventing database exhaustion and memory leaks at the same time. The `synccurvaProdutoProdutos` method used to sequentially await each of the database update operation (`this.prismaService.updateCurva`).
**Action:** Always check loop updates in synchronization tasks. If they don't depend on each other, chunk them using a helper and `Promise.all` to significantly improve throughput.
