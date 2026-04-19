## 2024-05-24 - Missing Authentication Guard on req.user Endpoints
**Vulnerability:** Critical endpoints (`ajustePositivo` and `ajusteNegativo`) were attempting to access `req.user` without applying `@UseGuards(JwtAuthGuard)`. This leads to `req.user` being undefined and completely bypasses authentication for sensitive inventory adjustment operations.
**Learning:** NestJS does not automatically infer or enforce authentication just because `@Req() req: any` is used in the method signature or `req.user` is accessed in the method body.
**Prevention:** Always explicitly decorate sensitive controller methods with `@UseGuards(JwtAuthGuard)` to enforce authentication checks before the route handler is executed.
