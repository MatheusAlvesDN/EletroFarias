
## 2026-03-21 - Optimize retornarProdutos database queries
**Learning:** Avoid nested loops for sequential Prisma operations (N+1 vulnerability); utilize Prisma's updateMany or similar bulk operations with the 'in' operator when iterating over arrays to reduce database roundtrips. In 'retornarProdutos', replacing N+M queries with a single 'updateMany' improves performance significantly.
**Action:** Always check for opportunities to use bulk operations like 'updateMany' instead of looping 'findMany' and 'update' when updating multiple records based on an array of identifiers.
