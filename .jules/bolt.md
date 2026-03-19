
## 2024-05-18 - Anti-pattern: Full table fetch for in-memory filtering and logging
**Learning:** In `integra-ifood`'s `PrismaService`, there is a recurring anti-pattern of fetching complete tables into application memory purely to filter arrays in JavaScript (e.g., `.filter(s => s.aprovado === false)`) or to calculate and log lengths before performing the actual targeted database query.
**Action:** Always scan for unconstrained `findMany()` calls and replace in-memory `.filter()` logic with Prisma `where` clauses to significantly reduce memory footprint and database IO, while eliminating redundant queries used solely for console logging.
