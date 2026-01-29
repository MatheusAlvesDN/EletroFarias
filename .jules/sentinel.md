## 2025-02-18 - Hardcoded Secrets in Source Control
**Vulnerability:** A valid iFood API access token (`token.json`) was committed to the repository and used directly from the source tree.
**Learning:** Developers often commit cache files if they are generated within the source tree and not ignored.
**Prevention:** Store ephemeral secrets/tokens in `os.tmpdir()` or a dedicated, gitignored `data/` directory outside the source tree. Ensure `.gitignore` covers all potential cache files.
