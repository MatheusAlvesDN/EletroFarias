## 2024-04-09 - Missing Authentication on Admin Endpoints
**Vulnerability:** Admin endpoints for user management (`getUsuarios`, `changeRole`, `criarUsuario`) were missing `@UseGuards(JwtAuthGuard)`, allowing any unauthenticated user to list users, change roles, or create new users (Broken Access Control).
**Learning:** In NestJS controllers where some routes are protected and others aren't, it is easy to forget to add the guard decorator on new endpoints.
**Prevention:** Consider applying guards at the controller level when most routes require authentication, or write tests specifically verifying that administrative routes return 401/403 for unauthenticated requests.
