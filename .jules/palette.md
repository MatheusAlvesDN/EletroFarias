## 2024-05-02 - Added semantic HTML5 required attributes to Login Form
**Learning:** Adding the visual red asterisk `*` and native HTML5 `required` attribute to the login form inputs helps users quickly identify mandatory fields and provides a more accessible fallback, but must be paired with `noValidate` on the form element so it doesn't conflict with custom React validation UI.
**Action:** Next time, ensure semantic HTML5 accessibility (e.g., `required`, `aria-hidden` for asterisk) is applied consistently with `noValidate` when custom logic governs validation feedback.
