## 2025-04-29 - Hardcoded default JWT Secret
**Vulnerability:** The JWT strategy fallback mechanism used a hardcoded string ('dev-secret') if the `JWT_SECRET` environment variable was missing.
**Learning:** Hardcoded default secrets are dangerous as they can inadvertently be used in production if the environment variable fails to load, allowing attackers to forge tokens.
**Prevention:** Always require critical secrets to be explicitly provided through environment variables and throw an explicit error during initialization if they are missing. Do not provide fallback secrets for cryptographic operations.
