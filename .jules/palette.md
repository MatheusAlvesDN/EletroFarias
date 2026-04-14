## 2024-04-14 - Visual Validation States and Screen Readers
**Learning:** When adding visual validation states (e.g., red error text) to inputs in `integra-front`, they must always be paired with programmatic associations (`aria-invalid="true"` and `aria-describedby="[error-id]"`). Otherwise, screen reader users do not receive the same error context as visual users.
**Action:** Always verify that visual error indicators have corresponding ARIA attributes and that the error message container has `role="alert"`.
