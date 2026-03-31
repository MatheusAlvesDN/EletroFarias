## 2024-03-31 - Initial Setup
**Learning:** Initialized Palette journal for critical UX/a11y learnings.
**Action:** Document important UX insights here.

## 2024-03-31 - Form Error State Associations
**Learning:** Adding visual error validation states (like red borders) to inputs without programmatic associations leaves screen reader users unaware of which specific field caused an error.
**Action:** Always pair visual error states with `aria-invalid="true"`, an `id` on the error message container, and `aria-describedby="[error-id]"` on the related inputs. Add `role="alert"` to the error container.
