## 2024-04-27 - Custom React Form Validation with Native Required Attributes
**Learning:** When adding native HTML5 `required` attributes to inputs that use custom React error states, the browser's default validation UI can conflict with the app's error presentation (e.g. tooltips or inline text).
**Action:** Add the `noValidate` attribute to the `<form>` element so that the custom validation logic controls the visual presentation without conflicting with the browser's default validation UI, while still providing the semantic accessibility benefits of the `required` attribute.
