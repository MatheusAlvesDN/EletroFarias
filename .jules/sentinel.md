# Sentinel's Journal

## 2026-02-09 - Committed Access Tokens
**Vulnerability:** A `token.json` file containing a live JWT access token was found committed in the `integra-ifood` directory.
**Learning:** This file was used to cache authentication tokens but was not excluded from version control. This exposes sensitive credentials to anyone with repository access.
**Prevention:**
1. Always add generated files (cache, logs, build artifacts) to `.gitignore` immediately.
2. Use environment variables for static secrets, but for dynamic/cached tokens, ensure the storage location is ignored.
3. Regularly scan the codebase for potential secrets (e.g., using `git-secrets` or similar tools).
