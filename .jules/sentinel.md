## 2024-03-22 - [Hardcoded JWT Secret Fallback]
**Vulnerability:** JWT strategy falls back to a hardcoded 'dev-secret' and `process.env` is accessed directly, allowing secure environments to run with a known secret if the environment variable is missing.
**Learning:** In NestJS `JwtStrategy`, `ConfigService` must be injected without access modifiers to validate configuration before calling `super()`. Modules must explicitly import `ConfigModule`.
**Prevention:** Always use `ConfigModule` and `ConfigService` for environment variables. Fail securely by throwing an explicit error during initialization if critical secrets are missing, rather than falling back to default values.
