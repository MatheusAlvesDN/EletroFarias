## 2024-10-18 - Missing Authentication on Sensitive Endpoints

**Vulnerability:** Endpoints handling sensitive operations like inventory adjustments (`ajustePositivo`, `ajusteNegativo`) access `req.user` but lack the `@UseGuards(JwtAuthGuard)` decorator. This allows unauthenticated users to execute critical actions, bypassing authorization and potentially manipulating inventory.
**Learning:** NestJS does not automatically enforce authentication just because `@Req() req: any` or `req.user` is present in the method signature. It requires an explicit Guard.
**Prevention:** Always verify that sensitive endpoints explicitly declare `@UseGuards(JwtAuthGuard)` (or an equivalent guard) when reading user context or performing actions that require an authenticated user.
