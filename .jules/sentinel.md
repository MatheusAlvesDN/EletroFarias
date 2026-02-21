## 2025-02-23 - Hardcoded Secrets & Token Leaks
**Vulnerability:** Found a live iFood API access token in `token.json` committed to the repo, and `JwtStrategy` defaulting to `'dev-secret'` if `JWT_SECRET` env var was missing.
**Learning:** Runtime-generated files (like `token.json`) are easy to accidentally commit. Hardcoded fallbacks for secrets create a false sense of security and allow production apps to run insecurely.
**Prevention:** Immediately `.gitignore` any file that stores runtime credentials. Use `ConfigService.getOrThrow()` to force the application to fail at startup if critical secrets are missing, rather than falling back to a weak default.
