## 2024-04-01 - JWT Secret Hardcoding and Unsafe Retrieval
**Vulnerability:** JWT strategies falling back to insecure hardcoded keys (`dev-secret`) and reading secrets directly from `process.env`.
**Learning:** In NestJS, dependencies like `JwtModule` and `JwtStrategy` should retrieve environment variables safely via `ConfigService`. Hardcoded defaults create a high risk of being deployed to production without generating a secure key.
**Prevention:** Always use `JwtModule.registerAsync` to configure `JwtModule`, and inject `ConfigService` in `JwtStrategy`. Explicitly throw an error if critical secrets are missing during initialization to enforce fail-secure behavior.
