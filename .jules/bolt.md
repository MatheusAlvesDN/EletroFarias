## 2025-02-17 - Optimized Prisma fetching to avoid memory exhaustion and JavaScript filtering
**Learning:** Found an O(N) fetch in `getSeparadores` that pulled all users into memory purely to execute a JavaScript filter. Also, `getSolicitacao` pulled the entire table and related items before filtering on `aprovado: false` in JS. Using Prisma's `where` clauses is essential to avoiding large memory footprints in Node.js.
**Action:** Always prefer pushing filtering logic down to the database using Prisma's `where` clauses instead of fetching all records and using `Array.prototype.filter`.
