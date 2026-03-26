## 2024-05-24 - Accessible Form Errors
**Learning:** Asynchronous form validation errors (like login failures) need to be explicitly announced to screen readers in `integra-front` using `role="alert"` and `aria-live="assertive"`. Inputs must also be linked using `aria-invalid` and `aria-describedby` for full accessibility context.
**Action:** Always wrap error message containers with `role="alert"` and use ARIA attributes on associated inputs when building or updating forms in this design system.
