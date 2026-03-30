## 2024-05-18 - Visual and Programmatic Form Validation Sync
**Learning:** When adding visual validation states (e.g., red error borders) to inputs in forms, failing to pair them with programmatic associations results in a disjointed experience where sighted users see the error state but screen reader users do not.
**Action:** Always pair visual error styling (like `border-red-500`) with programmatic associations (`aria-invalid="true"` and `aria-describedby="[error-id]"`) to ensure screen reader users receive the exact same error context as visual users.
