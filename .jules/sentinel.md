## 2024-02-09 - [CRITICAL] Committed Secrets (token.json)
**Vulnerability:** A `token.json` file containing a live iFood API access token (JWT) was tracked in git.
**Learning:** Credentials files generated at runtime must always be git-ignored. Developers often forget to ignore temporary files that contain sensitive data.
**Prevention:** Add `token.json` (and other generated credential files) to `.gitignore` immediately upon project setup. Use pre-commit hooks to scan for high-entropy strings or known token formats.
