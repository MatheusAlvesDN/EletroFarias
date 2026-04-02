## 2024-04-02 - Accessible Form Error States
**Learning:** When adding visual error states (like red borders) to form inputs, visual users see the error instantly, but screen reader users do not unless the error is programmatically linked to the input.
**Action:** Always pair visual error states with `aria-invalid="true"` and use `aria-describedby="[error-id]"` to point to the specific error message container (which should ideally have `role="alert"`). This ensures the error context is read aloud when the input receives focus.
