## 2026-05-04 - Adding accessibility alerts to error states
**Learning:** When adding native HTML5 `required` attributes to inputs that use custom React error states, the native browser validation bubble (which triggers before form submission) can conflict or overlay the custom UI, creating a confusing experience.
**Action:** Add the `noValidate` attribute to the `<form>` element. This prevents the browser's default validation UI from appearing while still allowing the custom JS/React validation logic (and  error messages) to control the visual presentation cleanly.
