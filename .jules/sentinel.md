## 2025-05-18 - [CRITICAL] Fix hardcoded JWT secret vulnerability
**Vulnerability:** A hardcoded default JWT secret ('dev-secret') and insecure `process.env` access were used instead of explicitly requiring the environment variable `JWT_SECRET`.
**Learning:** Fallbacks and direct `process.env` access for secrets allow for severe security oversights when deploying if variables aren't strictly checked or set securely via `ConfigService` asynchronously.
**Prevention:** Use `JwtModule.registerAsync` alongside `ConfigModule` and `ConfigService` to safely and securely load `JWT_SECRET`, failing securely with an explicit error if missing during initialization.
