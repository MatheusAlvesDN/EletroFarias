## 2026-04-07 - Hardcoded JWT Secret Fallback
**Vulnerability:** A hardcoded fallback string ('dev-secret') was used for the JWT secret in JwtStrategy, which could allow signature forgery if the environment variable was missing.
**Learning:** Direct process.env access in NestJS bypasses the ConfigModule lifecycle, leading developers to add insecure fallbacks to handle undefined values during instantiation.
**Prevention:** Use JwtModule.registerAsync with ConfigService to retrieve secrets securely, and throw a fatal Error during initialization if the secret is missing to prevent the app from starting in an insecure state.
