## 2025-05-05 - Optimize deletarNaoConfirmadas
**Learning:** Promise.all for sequential external API calls can mitigate N+1 network latency. However, using modern ESM packages like p-limit in CommonJS contexts causes crashes. Native chunking with Promise.all is preferred.
**Action:** Always use native Promise.all chunking instead of p-limit for managing concurrency in NestJS backend optimizations.
