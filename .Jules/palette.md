## 2024-05-06 - Accessible Form Validation in React
**Learning:** When combining native HTML5 `required` attributes (which are great for screen readers) with a custom React state-based validation UI (like custom error banners), the browser's default validation popups can conflict with the custom UI or fail to trigger properly if intercepted by JavaScript.
**Action:** Always add the `noValidate` attribute to the `<form>` element. This suppresses the native browser UI while still exposing the `required` constraints to assistive technologies and keeping the custom React UI clean.
