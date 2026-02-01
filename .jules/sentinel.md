## 2024-05-22 - Critical: Exposed API Token File
**Vulnerability:** The `integra-ifood/token.json` file containing a live JWT access token was tracked in the git repository.
**Learning:** Files containing sensitive dynamic data (like tokens) generated during runtime or development must be explicitly ignored before they are created or tracked. The assumption that "files in root are safe" or "I'll ignore it later" leads to leaks.
**Prevention:** Always check `.gitignore` before creating files that store secrets. Use `.example` files for required configuration structures.
