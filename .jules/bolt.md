
## 2024-05-14 - [Anti-pattern: Fetching full tables for JS filtering/counting]
**Learning:** In `integra-ifood/src/Prisma/prisma.service.ts`, there was a pattern of calling `findMany()` without arguments just to retrieve all records and then `filter()` or count them in JavaScript (e.g., `getSeparadores` and `getSolicitacao`). This loads massive amounts of unnecessary data into memory, causing OOM issues and significant latency as tables grow.
**Action:** Always use Prisma's `where` clauses (e.g., `where: { role: 'SEPARADOR' }` or `where: { aprovado: false }`) or `count()` methods. Push filtering and counting logic down to the database engine rather than performing it in Node.js.
