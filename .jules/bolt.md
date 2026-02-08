## 2025-02-27 - [Backend Bottleneck: Fidelimax Consumer Fetch]
**Learning:** The `pontuarNotasNaFidelimax` method in `integra-ifood/src/Fidelimax/fidelimax.service.ts` fetches the entire consumer database (pagination loop) via `listarTodosConsumidores` on every execution to check for existing CPFs. This is an O(N) operation where N is total consumers, causing severe performance degradation as the user base grows.
**Action:** Refactor `pontuarNotasNaFidelimax` to check for consumer existence individually (e.g., using `RetornaDadosCliente`) or optimistically attempt registration, reducing complexity to O(M) where M is the number of notes in the batch.

## 2025-02-27 - [Frontend: Sidebar Re-renders]
**Learning:** The `SidebarMenu` component was re-rendering all menu items whenever a single section was toggled. Extracting the list item logic into a memoized `SidebarSection` component and stabilizing the `onToggle` handler with `useCallback` successfully isolated these updates.
**Action:** Apply this pattern (memoized child component + stable callbacks) to other large interactive lists in the application, such as product lists or inventory grids.
