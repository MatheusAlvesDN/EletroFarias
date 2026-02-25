## 2025-02-18 - Missing Auth on Sensitive Endpoints
**Vulnerability:** `changeRole` and `criarUsuario` endpoints in `SyncController` were exposed without authentication, allowing privilege escalation and unauthorized user creation.
**Learning:** Controllers with mixed public/private endpoints are prone to security gaps because developers might assume a class-level guard exists or copy-paste unprotected methods.
**Prevention:** Apply `@UseGuards` at the controller level by default and use `@Public()` decorators for exceptions, or strictly audit every new endpoint added to "mixed" controllers.
