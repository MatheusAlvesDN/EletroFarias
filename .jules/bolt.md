## 2024-05-22 - [Fidelimax Consumer Fetching]
**Learning:** The `pontuarNotasNaFidelimax` method was fetching ALL consumers from the Fidelimax API (via pagination) just to check if a few consumers existed. This O(N) operation on total users for every batch of notes is a major scalability bottleneck.
**Action:** Replaced the "fetch all" strategy with a "check individual" strategy using `RetornaDadosCliente`. For APIs without bulk check endpoints, always prefer checking individual items (or optimistic processing) over fetching the entire dataset.
