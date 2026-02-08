## 2026-02-08 - [Hardcoded Token File]
**Vulnerability:** A `token.json` file containing an iFood access token was committed to the repository in `integra-ifood/`. This file is used as a local cache but was not ignored in `.gitignore`.
**Learning:** File-based caching of credentials without proper exclusion mechanisms is a high-risk pattern. Developers often assume local files are safe but forget to add them to `.gitignore`.
**Prevention:** Immediately add any file used for storing sensitive data (even temporarily) to `.gitignore`. Prefer memory-based caching or secure storage where possible.
