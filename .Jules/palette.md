## 2026-05-07 - Added visual indicator for required inputs
**Learning:** When adding visual required indicators to form labels (e.g., a red asterisk), include the `aria-hidden="true"` attribute on the indicator element to prevent screen readers from redundantly reading it aloud.
**Action:** Always add `aria-hidden="true"` to visual cues like asterisks that duplicate semantic HTML form validation features.
