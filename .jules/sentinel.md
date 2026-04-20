## 2024-04-20 - Hardcoded JWT Secret Fallbacks
**Vulnerability:** The NestJS `JwtStrategy` and `AuthModule` used a hardcoded fallback (`'dev-secret'`) or could silently accept an undefined `JWT_SECRET` if the environment variable was missing. This could allow unauthorized access if deployed to production without the variable set.
**Learning:** NestJS does not automatically fail securely if a strategy or module is initialized with a hardcoded or undefined secret. Relying on `|| 'dev-secret'` bypasses environment verification.
**Prevention:** Always explicitly throw an initialization error when critical environment variables like `JWT_SECRET` are missing, ensuring the application fails securely (fail-closed) rather than defaulting to insecure states.
