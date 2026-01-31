## 2026-01-31 - Hardcoded Token File
**Vulnerability:** `token.json` containing active API tokens was tracked in git.
**Learning:** Files generated at runtime that contain secrets must be explicitly ignored before they are ever created or committed.
**Prevention:** Ensure all runtime-generated files, especially those handling auth, are added to `.gitignore` during initial development.
