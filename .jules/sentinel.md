## 2024-02-18 - Enforce JWT_SECRET env var
**Vulnerability:** The `JwtStrategy` was configured with a default hardcoded secret ('dev-secret') which would be used if the `JWT_SECRET` environment variable was missing.
**Learning:** Defaulting to insecure values allows the application to run in a vulnerable state without warning. This violates the "Fail Secure" principle.
**Prevention:** Always ensure that critical security configuration (like secrets) must be present for the application to start. Throw an error if they are missing.
