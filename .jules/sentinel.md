## 2024-05-15 - Hardcoded Fallback Secrets and Top-Level Env Validation
**Vulnerability:** A hardcoded fallback secret (`'dev-secret'`) was found in the JWT strategy, and environment variables were read at the module's top level, risking initialization with undefined values.
**Learning:** Hardcoded secrets compromise token integrity, and NextJS ConfigModule requires async registration to guarantee env variables are loaded before evaluation.
**Prevention:** Use `ConfigModule` with async registration (`registerAsync`) and `ConfigService` for all secret material, and remove fallback development secrets.
