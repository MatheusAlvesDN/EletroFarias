## 2024-05-12 - Fix Hardcoded Secret Fallback and Top-level Environment Variable Validation
**Vulnerability:** `JwtStrategy` uses a fallback hardcoded secret `'dev-secret'`, and `AuthModule` uses `process.env.JWT_SECRET` directly during initialization.
**Learning:** Using `process.env` at the top level of NestJS modules can lead to unexpected behavior since the module is evaluated before `ConfigModule` might fully load `.env`. The fallback secret could allow bypassing authentication if `JWT_SECRET` isn't set.
**Prevention:** Use `ConfigModule` and asynchronous registration (`JwtModule.registerAsync`) to safely fetch the secret. Fail-fast if the secret is missing to prevent insecure defaults.
