## 2024-03-21 - [Hardcoded JWT Secret Fallback]
**Vulnerability:** The application used a hardcoded fallback (`'dev-secret'`) in `JwtStrategy` and insecure direct access to `process.env` in `JwtModule`, which could result in weak tokens if `JWT_SECRET` is missing.
**Learning:** `process.env` access at module initialization can fail silently before the environment is fully loaded. `JwtModule` should be registered asynchronously using `registerAsync` with `ConfigService`.
**Prevention:** Always use `ConfigService` to inject environment variables securely and fail fast by explicitly throwing an error if critical secrets are missing.
