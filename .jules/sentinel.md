## 2025-05-08 - Hardcoded JWT Secret Fallback and Sync Loading
**Vulnerability:** A hardcoded fallback secret ('dev-secret') was used in `JwtStrategy` and the secret was loaded synchronously in `AuthModule`.
**Learning:** NestJS `ConfigModule` may not have fully initialized when synchronous top-level or module definitions evaluate `process.env.JWT_SECRET`, resulting in undefined values that silently trigger insecure fallbacks.
**Prevention:** Always use asynchronous registration (e.g., `JwtModule.registerAsync`) and inject `ConfigService` to safely fetch and validate secrets, throwing an explicit error if missing rather than falling back to hardcoded strings.
