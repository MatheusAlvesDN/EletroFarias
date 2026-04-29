## 2025-04-29 - Login Form Required Attributes Accessibility
**Learning:** Adding the native `required` attribute to inputs when using a custom React submission flow causes the browser to intercept the form with a native validation popup, preventing the custom error UI from handling it gracefully.
**Action:** Always add the `noValidate` attribute to the `<form>` element when combining HTML5 `required` attributes with custom client-side validation logic. This ensures screen readers announce the fields as mandatory while preserving the custom application UX.
