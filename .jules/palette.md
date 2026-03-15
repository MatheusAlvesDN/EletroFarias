## 2024-05-18 - [Accessible Asynchronous Form Validation]
**Learning:** For asynchronous form validation like login errors in `integra-front`, error containers must use `role="alert"` and `aria-live="assertive"`, and corresponding inputs should be linked via `aria-invalid` and `aria-describedby` to properly inform screen readers of dynamically injected error states.
**Action:** Always include `role="alert"`, `aria-live`, `aria-invalid`, and `aria-describedby` when dealing with dynamically rendered validation errors in form components.
