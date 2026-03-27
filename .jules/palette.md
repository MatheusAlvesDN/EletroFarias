
## 2024-10-30 - Accessible Async Form Validation
**Learning:** Asynchronous login errors in Next.js apps require specific aria attributes (role="alert", aria-live="assertive") and input associations (aria-invalid, aria-describedby) to be read correctly by screen readers. Furthermore, role="alert" can conflict with Next.js route announcer in tests if not targeted properly via IDs.
**Action:** Always add id attributes to custom alerts and use them for targeted test assertions, while linking inputs using aria-describedby. Mirror login form changes across duplicate pages.
