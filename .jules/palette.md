
## 2024-03-24 - Accessible Asynchronous Form Validation
**Learning:** For accessible asynchronous form validation in Next.js/React applications (like login errors), simply conditionally rendering an error message is insufficient for screen readers. The error container must use `role="alert"` and `aria-live="assertive"`. Furthermore, the corresponding inputs must be explicitly linked to the error container via `aria-invalid` and `aria-describedby` so the screen reader announces the specific error context when the input is focused or validated.
**Action:** When implementing form validation, always verify that error containers are configured as live regions and that inputs are semantically linked to their error states using ARIA attributes.
