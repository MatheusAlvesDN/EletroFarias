## 2025-02-19 - [In-memory Array Filtering of Database Results]
**Learning:** Returning full table data to Node to process filtering with JavaScript `.filter()` consumes unnecessary memory and introduces an unoptimized full table scan before execution of JS application logic.
**Action:** Always utilize Prisma’s `where` and `select` clauses (e.g., `where: { aprovado: false }`) directly in the database query to return only the requested objects to memory.
