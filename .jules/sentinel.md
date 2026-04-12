## 2025-04-12 - Remove Hardcoded JWT Secret Fallback
**Vulnerability:** A hardcoded secret fallback ('dev-secret') was being used in `jwt.strategy.ts` if `JWT_SECRET` was not set, which could allow attackers to forge valid JWT tokens and bypass authentication if the environment variable was missing.
**Learning:** Default fallbacks for secrets can easily be deployed to production if environment variables are not strictly validated, severely compromising application security.
**Prevention:** Always enforce that critical secrets like `JWT_SECRET` are present in the environment configuration, failing fast if they are missing instead of falling back to default values.
