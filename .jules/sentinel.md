## 2024-04-15 - Hardcoded JWT Secret Fallback
**Vulnerability:** A hardcoded string ('dev-secret') was used as a fallback for the JWT secret if the environment variable was missing.
**Learning:** Developers sometimes leave development convenience fallbacks that can unintentionally persist into production, resulting in forged JWTs if environment variables fail to load. NestJS JWT modules should explicitly fail fast rather than fallback.
**Prevention:** Always throw initialization errors for missing sensitive environment variables rather than providing generic defaults.
