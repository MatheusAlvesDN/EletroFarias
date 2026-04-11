## 2024-04-11 - Add Authentication to Admin Endpoints
**Vulnerability:** Critical admin endpoints like `changeRole`, `criarUsuario` and `getUsuarios` were missing `JwtAuthGuard`, allowing unauthenticated actors to retrieve the user list, change roles to admin, and create new admin users.
**Learning:** In NestJS controllers, missing the `@UseGuards(JwtAuthGuard)` decorator means an endpoint is entirely public. A user management endpoint left open is a CRITICAL severity authorization bypass risk.
**Prevention:** Always verify that sensitive endpoints, especially those dealing with user roles, credentials, and user enumeration, have `@UseGuards` decorators applied.
