## 2025-02-28 - [Auth Bypass in Sync API]
**Vulnerability:** Critical endpoints (`/sync/ajustePositivo` and `/sync/ajusteNegativo`) that modify inventory and rely on `req.user` were missing the `@UseGuards(JwtAuthGuard)` decorator.
**Learning:** NestJS does not automatically enforce authentication just because `@Req() req: any` is used in the method signature. This allows unauthorized access if the guard is missing.
**Prevention:** Always explicitly apply `@UseGuards(JwtAuthGuard)` to sensitive endpoints, especially those that extract user context from the request.
