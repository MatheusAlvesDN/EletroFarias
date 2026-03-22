## 2024-03-22 - Accessible Form Error Validation
**Learning:** Asynchronous form validation errors in the app (like the login screens) lack appropriate ARIA attributes, meaning screen readers are not notified when errors appear, and inputs are not linked to their respective error descriptions.
**Action:** Always wrap form error messages in a container with `role="alert"` and `aria-live="assertive"`. Simultaneously, use `aria-invalid={!!error}` and `aria-describedby="<error-id>"` on the relevant inputs to ensure screen reader users receive proper validation feedback.
