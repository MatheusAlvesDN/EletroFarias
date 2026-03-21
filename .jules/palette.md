## 2024-05-24 - Accessible Asynchronous Form Validation
**Learning:** For accessible asynchronous form validation in Next.js/React applications, dynamically rendered error messages are often missed by screen readers unless explicitly marked.
**Action:** When creating form error states, ensure the error container uses `role="alert"` and `aria-live="assertive"` (or `polite`), and link inputs to the error using `aria-invalid` and `aria-describedby`.
