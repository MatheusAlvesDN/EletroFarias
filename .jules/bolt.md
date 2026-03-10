## 2025-03-10 - [Optimization] Bulk Updates over Nested Queries
**Learning:** The 'retornarProdutos' method originally used a nested loop pattern that caused O(N+M) database operations (one 'findMany' per code, plus one 'update' per found product). This represents a significant N+1 query vulnerability when iterating over arrays in Prisma.
**Action:** Use Prisma's 'updateMany' with an 'in' clause for bulk updates instead of looping and resolving queries synchronously, reducing round trips from O(N+M) to O(1) query.
