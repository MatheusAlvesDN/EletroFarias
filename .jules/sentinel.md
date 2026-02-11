## 2026-02-11 - Fail Secure Authentication Secrets
**Vulnerability:** The application used a weak default secret ('dev-secret') in `JwtStrategy` when `JWT_SECRET` was undefined. This would allow attackers to forge tokens if deployed without setting the environment variable.
**Learning:** Hardcoded fallbacks in security-critical code often lead to "Fail Open" vulnerabilities. Developers might forget to set environment variables, leaving the app vulnerable by default.
**Prevention:** Implement "Fail Secure" logic. Throw an error during startup if critical security configuration is missing, forcing the deployment to fail rather than run insecurely. Use unit tests to verify that the application refuses to start with invalid configuration.
