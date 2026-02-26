## 2025-02-18 - Hardcoded iFood Access Token
**Vulnerability:** A valid iFood API access token (JWT) was committed to the repository in `integra-ifood/token.json`. The token had a long expiration date (August 2025), granting unauthorized access to the iFood merchant account.
**Learning:** The application logic in `IfoodService.ts` writes the access token to `token.json` for caching but does not automatically ignore this file, leading to accidental commit.
**Prevention:** Added `token.json` to `.gitignore` and removed the file from the repository. Future implementations of token caching should ensure the cache file is explicitly ignored or stored in a temporary directory outside the source tree.
