## 2025-03-08 - SidebarMenu Pattern
**Learning:** Navigation logic is duplicated: `SidebarMenu.tsx` handles the drawer, but `Page.tsx` (dashboard) manually re-implements the same menu structure in the main content area using distinct Material UI components.
**Action:** When updating navigation UX, ensure both `SidebarMenu.tsx` and the dashboard page (`src/app/inicio/page.tsx`) are consistent if the change affects the menu structure or behavior.
