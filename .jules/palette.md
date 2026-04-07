## 2024-04-07 - Form Input Validation Accessibility

**Learning:** When using React states to display an error message at the top of a form (`<div role="alert">`), screen readers might not immediately associate the error with the specific inputs being focused or typed in. Visual users get inline red borders (added to the login form), but we also need programmatic associations.

**Action:** Added `aria-invalid={!!error}` and `aria-describedby={error ? "login-error" : undefined}` to the email and password inputs in `integra-front/src/app/page.tsx` and `integra-front/src/app/homepage/page.tsx`. This ensures screen reader users receive the same error context as visual users when interacting with the form.
