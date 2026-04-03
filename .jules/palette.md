## 2024-05-18 - Next.js Route Announcer Conflict with Alerts
**Learning:** In Next.js applications, testing `role="alert"` elements using Playwright's `getByRole('alert')` conflicts with the internal Next.js route announcer (`#__next-route-announcer__`), leading to strict mode violations.
**Action:** Always use explicit IDs (e.g., `#login-error`) to locate custom alert elements in Next.js Playwright tests rather than relying on `getByRole('alert')`.
