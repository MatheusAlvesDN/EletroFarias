## 2024-05-15 - [CRITICAL] Prevent fallback to hardcoded JWT secret
**Vulnerability:** JWT strategy used a hardcoded fallback secret ('dev-secret') if the `JWT_SECRET` environment variable was missing.
**Learning:** When configuring NestJS modules or strategies in `integra-ifood`, explicitly throw errors during initialization for missing critical environment variables (e.g., `JWT_SECRET`) instead of using hardcoded fallbacks to ensure the application fails securely.
**Prevention:** Always validate critical environment variables at startup and throw an error rather than defining a hardcoded fallback.
