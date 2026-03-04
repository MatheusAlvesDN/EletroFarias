## 2024-05-20 - Accessible Form Validation
**Learning:** React state-based error messages for login forms aren't automatically announced by screen readers when they appear, leaving visually impaired users unaware of authentication failures.
**Action:** Always wrap error message containers with `role="alert"` and `aria-live="assertive"`, and link them to the relevant inputs using `aria-invalid={true}` and `aria-describedby="error-id"`.
