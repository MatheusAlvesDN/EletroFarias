## 2025-05-17 - Hardcoded JWT Secret Fallback Removed
**Vulnerability:** The application used a hardcoded fallback (`dev-secret`) for the `JWT_SECRET` in `JwtStrategy`.
**Learning:** Hardcoded secrets in strategies can allow bypasses or token forging in production if the environment variable is accidentally omitted.
**Prevention:** Remove fallback values for critical secrets. Fail fast if the required configuration is missing.
