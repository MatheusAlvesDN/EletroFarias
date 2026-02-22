## 2025-05-23 - [Frontend] Capacitor Build Constraints
**Learning:** `integra-front` is built for Capacitor (`Integra-app`) and requires `output: 'export'`, `trailingSlash: true`, and `images: { unoptimized: true }` in `next.config.ts`.
**Action:** Ensure these settings are present in `next.config.ts` when modifying the frontend build configuration to avoid breaking the mobile app.
