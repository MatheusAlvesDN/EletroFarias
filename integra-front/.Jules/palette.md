## 2025-02-26 - Navigation Semantics and Image Optimization
**Learning:** The application heavily relies on Material UI `List` for navigation but often lacks semantic wrappers like `<nav>` or proper ARIA labels. Additionally, images were implemented using `Box component="img"`, bypassing Next.js optimization.
**Action:** When working on navigation components, wrap `List` in `<Box component="nav" aria-label="...">`. Convert static images to `next/image` using a relative wrapper `Box` for styling control.
