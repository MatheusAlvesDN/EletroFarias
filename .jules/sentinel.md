
## 2025-03-16 - Prevent Insecure Defaults in JWT Configuration
**Vulnerability:** The application used a hardcoded fallback (`'dev-secret'`) and an insecure direct extraction from `process.env` when configuring the `JwtStrategy` and `JwtModule`.
**Learning:** This exposes the application to silent configuration failures where it falls back to a publicly known secret. Using `ConfigModule.registerAsync` is required to ensure dependencies wait for configuration to load, but in strategy classes extending `PassportStrategy`, `ConfigService` must be explicitly injected in the constructor without access modifiers to prevent TS2376.
**Prevention:** Always enforce secure failure. When validating environment variables required for authentication (like `JWT_SECRET`), explicitly throw an error if missing during initialization rather than assigning a fallback. Use `ConfigModule` rather than `process.env`.
