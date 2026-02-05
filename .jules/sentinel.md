## 2025-02-09 - Hardcoded Token File Committed
**Vulnerability:** `integra-ifood/token.json` containing live iFood access tokens was tracked in git.
**Learning:** The application architecture persists tokens to a file in the root directory, which defaults to being tracked if not explicitly ignored.
**Prevention:** Ensure all runtime-generated credential files are added to `.gitignore` before project initialization.
