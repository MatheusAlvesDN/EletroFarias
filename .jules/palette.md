## 2025-05-18 - Sidebar Accessibility
**Learning:** Collapsible menu items require `aria-expanded` and `aria-controls` for screen reader accessibility. I implemented this pattern in `SidebarMenu.tsx` by generating unique IDs for content regions.
**Action:** Apply this pattern to other collapsible sections in the app, specifically in `src/app/inicio/page.tsx` which duplicates the menu structure.

## 2025-05-18 - Playwright Authentication Mocking
**Learning:** Frontend verification via Playwright requires mocking the `authToken` in `localStorage` with a valid JWT structure (header.payload.signature) to bypass the login screen and access protected routes like `/inicio`.
**Action:** Use this authentication mock strategy for future frontend tests.
