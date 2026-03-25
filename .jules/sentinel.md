## Sentinel's Journal
## 2024-05-23 - Hardcoded JWT Secret Vulnerability Fixed
**Vulnerability:** The application was using a hardcoded JWT secret ('dev-secret') as a fallback when `process.env.JWT_SECRET` was not provided, and directly accessing `process.env` in `@nestjs/passport` configuration, bypassing `ConfigModule`.
**Learning:** Hardcoded fallbacks in authentication logic often exist for local testing but silently compromise security in production environments if the actual environment variable is not passed correctly. Using direct `process.env` in nest decorators can result in secrets not loading when dynamic modules are used.
**Prevention:** Instead of falling back to insecure defaults, authentication modules should throw a clear error upon startup if critical secrets are missing, and use `ConfigModule`/`registerAsync` to securely retrieve configuration through injection.
