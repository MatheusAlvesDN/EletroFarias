
## 2024-05-24 - [Accessible Form Validation for Async Errors]
**Learning:** For asynchronous validation errors (like login failures) that appear dynamically without page reloads, screen readers need explicit cues. Setting an element with `role="alert"` and `aria-live="assertive"` ensures immediate announcement. Linking the relevant inputs with `aria-invalid` and `aria-describedby` provides continuous context if the user navigates back to the fields.
**Action:** Apply the `role="alert"` + `aria-live="assertive"` + `aria-describedby` + `aria-invalid` pattern for dynamic form errors across the app.
