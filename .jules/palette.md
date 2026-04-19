## 2023-10-27 - A11y: Alert Role on Error Messages
**Learning:** React SPA error states (like invalid login banners) appear visually but are completely silent to screen readers unless explicitly marked with `role="alert"` and `aria-live="assertive"`. This app has duplicated login components (`app/page.tsx` and `app/homepage/page.tsx`) that share this vulnerability.
**Action:** When adding validation feedback, always ensure error states are wrapped in an `aria-live` region or given `role="alert"` so they are announced proactively.
