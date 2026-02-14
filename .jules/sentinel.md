# Sentinel's Journal

## 2026-01-06 - Hardcoded Secrets in Git

**Vulnerability:** A `token.json` file containing a valid iFood API access token was tracked in the git repository.
**Learning:** Development convenience (easy access to tokens) often leads to committing secrets if `.gitignore` is not configured early.
**Prevention:**
1.  Always add files storing secrets (e.g., `*.json`, `.env`) to `.gitignore` BEFORE creating them.
2.  Use `git rm --cached` to stop tracking files without deleting them from the local environment.
3.  Implement a pre-commit hook or CI check to scan for high-entropy strings or known secret patterns.
