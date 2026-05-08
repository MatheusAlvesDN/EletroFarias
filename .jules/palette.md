## 2024-05-18 - Accessibility on Login Forms
**Learning:** React login forms with custom error handling but native `required` input attributes can conflict with browser validation UI. Screen readers also benefit from native required attributes but visual indicators (like asterisks) should have `aria-hidden="true"`.
**Action:** Always combine custom form error banners with `noValidate` on the `<form>` element while still using native `required` on `<input>` fields, and add `aria-hidden="true"` to visual asterisks to provide the best accessible and clean UX.
