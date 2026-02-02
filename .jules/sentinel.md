## 2025-02-23 - Exposed Production Token
**Vulnerability:** Found `token.json` containing a live JWT token in the `integra-ifood` root directory.
**Learning:** Build artifacts or runtime credentials generated during local development or server operation can accidentally be committed if not explicitly ignored.
**Prevention:** Always add runtime credential files (`token.json`, `.env`, `credentials.json`) to `.gitignore` before generating them.
