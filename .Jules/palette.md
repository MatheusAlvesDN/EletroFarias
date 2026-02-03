## 2025-05-15 - Accessibility & Internal Linking
**Learning:** Found multiple instances of inline styles being used for buttons with poor contrast (#0FF on White) and `<a>` tags used for internal client-side navigation. This suggests a need to standardize on Tailwind classes and Next.js `<Link>` components to ensure accessibility and single-page app behavior.
**Action:** When spotting inline styles or `<a>` tags for internal routes, replace them with Tailwind utility classes (using darker shades like `cyan-700` for contrast) and `<Link>` components.
