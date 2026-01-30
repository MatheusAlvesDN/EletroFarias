# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2024-05-22 - [Sidebar Menu Rendering]
**Learning:** Re-rendering the entire sidebar for every section toggle is inefficient, especially with many items.
**Action:** Extract section rendering to a memoized component to isolate updates.
