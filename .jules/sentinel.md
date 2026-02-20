## 2024-05-23 - [CRITICAL] Leaked Credentials in Repository
**Vulnerability:** A `token.json` file containing a valid JWT access token was found in the repository root.
**Learning:** Credentials generated at runtime can be accidentally committed if not explicitly ignored.
**Prevention:** Always add runtime-generated files (especially those containing secrets) to `.gitignore` before the first run. Use pre-commit hooks to scan for potential secrets.
