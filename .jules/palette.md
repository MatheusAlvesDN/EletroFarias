
## 2025-03-16 - [UX Improvement] Accessible Form Validation in Login Forms
**Learning:** In `integra-front`, error messages that are rendered asynchronously upon form submission failures (like invalid credentials) are not automatically announced by screen readers without proper ARIA attributes. Providing a visual error isn't sufficient for accessibility.
**Action:** When adding or fixing asynchronous form validations, always wrap error messages in a container with `role="alert"` and `aria-live="assertive"`. Additionally, explicitly link the error message to the corresponding input fields using `aria-invalid={!!error}` and `aria-describedby="error-id"` to provide immediate context to assistive technologies.
