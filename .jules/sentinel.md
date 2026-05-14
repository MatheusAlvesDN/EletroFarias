## 2024-05-14 - Hardcoded JWT Secret Fallback
**Vulnerability:** The application used a hardcoded fallback ('dev-secret') for the JWT secret if the environment variable was missing.
**Learning:** Using default/fallback secrets means that if environment variables fail to load in production, the application will silently start in a critically vulnerable state where attackers can forge auth tokens.
**Prevention:** The application must fail fast (throw an error) on startup if critical cryptographic secrets are missing. Never provide default strings for secrets.
