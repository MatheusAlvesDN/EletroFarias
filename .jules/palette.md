## 2026-05-09 - Adding accessibility attributes to forms
**Learning:** When using custom error messages in React forms instead of native browser popups, we must suppress native validation using `noValidate` on the form while still providing `required` and `aria-invalid` on the inputs. Error messages must use `role="alert"` and `aria-live="assertive"` so screen readers announce them properly on submission failure.
**Action:** Add `noValidate` to forms and pair it with explicit ARIA attributes on inputs and error states to properly support assistive technology without UI conflicts.
