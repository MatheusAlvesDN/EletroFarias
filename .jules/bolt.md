## 2026-03-30 - Delegate data filtering to database
**Learning:** Fetching full tables purely to filter them in Node.js creates a memory bottleneck and redundant network load.
**Action:** Always utilize Prisma's `where` clause to filter records at the database level rather than fetching everything and relying on `.filter()` or mapping in JavaScript.
