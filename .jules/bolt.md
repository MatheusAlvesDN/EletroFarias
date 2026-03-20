
## 2025-02-28 - Avoid fetching full tables for filtering and counts
**Learning:** In `integra-ifood/src/Prisma/prisma.service.ts`, methods like `getSolicitacao` and `getSeparadores` were fetching entire database tables (`await prisma.solicitacao.findMany()` and `await prisma.user.findMany()`) into Node.js memory just to filter them using JavaScript arrays or count them for logging. This creates a severe N-sized object generation bottleneck on the Node heap and causes unnecessary DB latency via full-table scans.
**Action:** Always use Prisma's `where` clauses to push filtering down to the database level. Never fetch unbounded collections of data purely for counting or simple filtering logic.
