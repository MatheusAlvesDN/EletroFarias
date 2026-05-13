## 2024-05-16 - Custom Error UI with Native Required Validation
**Learning:** Combining native `required` attribute with `noValidate` on the parent `<form>` disables default HTML5 browser tooltips while retaining semantic properties for screen readers, allowing the use of a unified custom error banner that works well with `aria-live="assertive"`.
**Action:** When adding standard validation properties (`required`, `aria-required`) to custom UI components that handle errors manually, explicitly add `noValidate` to the wrapping form.
