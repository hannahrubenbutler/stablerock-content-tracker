

## Plan: Remove Published Tab, Restyle Submit as Button

### Changes

**`src/components/AppHeader.tsx`**
- Remove `'Published'` from the `TABS` array → `['Dashboard', 'All Requests', 'Calendar', 'Assets', 'Submit']`
- Reorder so `Submit` is last
- Render `Submit` differently: instead of a tab-style button, render it as a standalone accent button (solid background, rounded, no bottom border style) — visually separated from the nav tabs (e.g. with `ml-auto` to push it right)

**`src/pages/Index.tsx`**
- Remove the `Published` tab rendering and `PublishedView` import
- Ensure `TabName` type update flows through (it derives from `TABS` so it's automatic)

**`src/components/PublishedView.tsx`**
- No deletion needed, but it becomes unused. Can leave or remove.

### Visual Result
Nav: `Dashboard | All Requests | Calendar | Assets` (standard tabs) ... `[+ Submit]` (accent button, right-aligned)

