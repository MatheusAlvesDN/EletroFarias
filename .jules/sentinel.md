## 2025-02-28 - [CRITICAL] Hardcoded fallback secret in JwtStrategy
**Vulnerability:** A hardcoded fallback string `'dev-secret'` was used in `JwtStrategy` when reading `JWT_SECRET` from environment variables, which can lead to severe security breaches if accidentally run in production.
**Learning:** This codebase incorrectly relied on `process.env.JWT_SECRET` directly with a fallback, rather than failing securely.
**Prevention:** Ensure all authentication secrets are strictly managed via `@nestjs/config` (`ConfigService`) using `registerAsync` for module registration, and explicitly throw errors when configuration is absent, enforcing fail-secure principles.
