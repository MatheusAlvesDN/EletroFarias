## 2024-05-18 - Accessible Form Validation Pattern
**Learning:** The application's authentication forms display visual error states through a general banner but lack programmatic association with the input fields (`aria-invalid` and `aria-describedby`). Additionally, bright cyan (`#0FF`) buttons fail contrast checks.
**Action:** When adding or fixing forms, pair visual validation with `aria-invalid={!!error}` and `aria-describedby="[error-id]"`. Replace low-contrast bright cyan (`#0FF`) with darker accessible shades like `#0891b2`.
