## 2024-05-17 - Added Accessibility to Authentication Errors
**Learning:** React state-driven error messages on login forms are not natively announced by screen readers when they appear dynamically.
**Action:** Always wrap dynamic error messages in containers with `role="alert"` and `aria-live="assertive"` to ensure immediate screen reader announcement. Additionally, disable inputs alongside submit buttons during loading states to clarify UI state and prevent conflicting interactions.
