## 2025-02-14 - Hardcoded Secret Fallback in Strategies
**Vulnerability:** The `JwtStrategy` used a hardcoded fallback `'dev-secret'` when the `JWT_SECRET` environment variable was missing. This allowed the application to start and operate with a weak, known secret in production if configuration was accidentally omitted.
**Learning:** `PassportStrategy` constructors in NestJS are often used to pass options directly. Using `process.env` with a `||` fallback here bypasses the validation and safety mechanisms provided by `ConfigModule` and `ConfigService`.
**Prevention:** Always inject `ConfigService` into strategies and throw an explicit error if critical secrets are missing. Do not provide default fallbacks for secrets.
