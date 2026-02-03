## 2026-02-03 - Runtime Token File Exposure
**Vulnerability:** A `token.json` file containing a valid, live JWT access token was committed to the repository and not excluded by `.gitignore`. This file was used for caching authentication tokens at runtime.
**Learning:** Runtime artifacts that cache sensitive data (like tokens) can easily be accidentally committed if not explicitly ignored, leading to credential leakage. The file system should be used with caution for caching secrets; memory caching or secure storage is preferred.
**Prevention:** Always add file paths used for local caching or runtime data generation to `.gitignore` immediately upon implementation.
