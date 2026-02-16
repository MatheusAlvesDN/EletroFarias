# Sentinel's Journal

## 2026-02-16 - Fail Secure Authentication
**Vulnerability:** A hardcoded fallback secret ('dev-secret') was found in `JwtStrategy`. This meant if `JWT_SECRET` was missing in production, the app would silently default to a known insecure secret, allowing token forgery.
**Learning:** Defaulting to "development" values in authentication code violates the "Fail Secure" principle. The application should crash rather than run in an insecure state.
**Prevention:** Never use `|| 'default'` for secrets. Explicitly check for the existence of the secret and throw an error if it's missing, forcing the deployment to fail if misconfigured.
