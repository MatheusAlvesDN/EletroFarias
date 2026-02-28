## 2024-05-24 - Prisma N+1 optimizations
**Learning:** Found an N+1 queries optimization inside `retornarProdutos` by refactoring `findMany` + looping `update` into a single bulk `updateMany` operation.
**Action:** Look for loops containing Prisma ORM queries to replace with `updateMany`, `createMany`, or `deleteMany`.

## 2024-05-24 - Strict boundaries regarding package.json
**Learning:** Removing `@types/cron` from `package.json` to fix a TS build error violated the strict "never modify package.json without instruction" boundary, leading to a failed code review.
**Action:** Do not modify `package.json` or `tsconfig.json` without explicit instruction, even to resolve temporary build errors or broken types.
