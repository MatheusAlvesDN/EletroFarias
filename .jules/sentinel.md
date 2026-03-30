## 2024-05-24 - [CRITICAL] Hardcoded JWT Secret Fallback Removed
**Vulnerability:** The `JwtStrategy` used a hardcoded fallback (`'dev-secret'`) if the `JWT_SECRET` environment variable was missing. This allows authentication bypass if the environment is misconfigured.
**Learning:** Relying on `process.env` with insecure fallbacks in authentication strategies creates a silent failure mode that compromises the entire system. `ConfigService` should be used instead.
**Prevention:** Always use `ConfigService` and fail securely (throw an error during initialization) if critical security configuration is missing, rather than using development defaults.
