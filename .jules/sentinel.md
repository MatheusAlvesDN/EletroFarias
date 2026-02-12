## 2024-05-23 - Hardcoded JWT Secret Fallback
**Vulnerability:** The `JwtStrategy` was configured with a hardcoded fallback secret `'dev-secret'` when the `JWT_SECRET` environment variable was missing. This allowed anyone to forge valid JWT tokens by signing them with `'dev-secret'`.
**Learning:** Hardcoded fallbacks for critical security configuration (like secrets) can silently undermine security even if the rest of the system is configured correctly. "Fail Open" (using a default insecure value) is dangerous; "Fail Secure" (crashing if configuration is missing) is required.
**Prevention:** Always enforce the presence of critical secrets at startup. Throw an error if they are missing. Avoid `|| 'default'` patterns for sensitive values.
