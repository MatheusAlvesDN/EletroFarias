## 2024-05-18 - Insecure JWT Configuration
**Vulnerability:** Hardcoded dev fallback for JWT secret (`'dev-secret'`) and direct `process.env` access bypassing NestJS `ConfigModule` in `JwtStrategy` and `AuthModule`.
**Learning:** NestJS modules and providers should always use `ConfigService` via `registerAsync` to safely inject secrets and fail explicitly (crash early) if secrets are absent, preventing unintentional deployment with well-known fallback secrets.
**Prevention:** Avoid fallback strings for secrets. Use `ConfigService.get()` and explicitly check for truthiness, throwing an error if missing.
