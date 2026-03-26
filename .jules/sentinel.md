## 2026-03-26 - Prevent Insecure Default JWT Secrets

**Vulnerability:** The `JwtStrategy` fell back to a hardcoded 'dev-secret' if `JWT_SECRET` was missing from the environment, allowing anyone with the default secret to forge valid tokens in production.
**Learning:** Hardcoded fallbacks in configuration are dangerous because they fail silently (insecurely) rather than loudly (securely), leading to easily bypassed authentication if environment variables fail to load.
**Prevention:** Always use `ConfigService` to fetch sensitive environment variables, and explicitly throw an error during initialization if they are missing to ensure the application fails securely.
