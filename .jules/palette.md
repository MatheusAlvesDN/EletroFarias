## 2025-05-11 - Accessibility on error messages and required fields
**Learning:** Error messages in login forms are often not read by screen readers immediately, leaving visually impaired users unaware of validation failures. The native `required` attribute helps in client-side validation natively.
**Action:** Always add `aria-live="assertive"` and `role="alert"` to error containers, and the `required` attribute on input fields when submitting a form, specifically login forms.
