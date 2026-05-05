## 2024-03-24 - Combine required, aria-hidden and noValidate for accessible forms
**Learning:** Adding native `required` tags improves screen reader accessibility, but can conflict with custom React form validation (like showing an error banner). Also, adding a visual asterisk (`*`) to the label causes screen readers to redundantly read "star".
**Action:** Always add `noValidate` to the `<form>` to suppress the browser's default validation UI while keeping native validation attributes for a11y, and apply `aria-hidden="true"` to visual asterisks so screen readers ignore them.
