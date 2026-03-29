
## 2024-05-20 - Accessible Form Validation in Next.js
**Learning:** Adding `role="alert"` for form errors in Next.js can conflict with the internal `#__next-route-announcer__` during Playwright testing. Furthermore, visual validation states (like red borders) must be paired with programmatic associations (`aria-invalid` and `aria-describedby`) to ensure screen reader users receive the same error context.
**Action:** Always combine `role="alert"` with an explicit `id` (e.g., `id="login-error"`) on the error container, and bind inputs using `aria-invalid` and `aria-describedby`.
