## 2024-03-25 - NestJS ESM vs CommonJS Concurrency Restrictions
**Learning:** In the integra-ifood NestJS application, pure ESM packages (like `p-limit` v6+) for concurrency control will crash the application with `ERR_REQUIRE_ESM` because it compiles to CommonJS.
**Action:** Implement custom array chunking using `for` loops and `Promise.all` natively to achieve concurrent database write limits (e.g., chunk size of 50) instead of relying on external pure-ESM concurrency helpers.
