

## Plan: Comprehensive UI/UX Improvements (27 items)

This is a large batch of changes across all views. No database migration needed — all columns already exist. Grouped by file for implementation.

### 1. Add Stage Colors to Constants (`src/lib/constants.ts`)

Add `STAGE_COLORS` map for colored top borders on stage cards and stage dots on calendar:
- Requested → yellow, Needs Info → orange, In Progress → blue, In Simplified → purple, Client Review → amber, Scheduled → teal, Published → green, On Hold → gray

### 2. Dashboard (`src/components/Dashboard.tsx`) — Items 1-6

- **Move Needs Client Action** up between This Week/Next Week and monthly grids
- **Group by contact person** in Needs Client Action, show person name prominently as group header
- **Stage card colored top borders** using STAGE_COLORS
- **Show "Needed from Client"** as red subtext under This Week / Next Week items
- **Zero cells in monthly grids**: pink/red background (`bg-red-50`) instead of dashes
- **Add Total column + Total row** to both monthly grids (sum per row and per column)

### 3. All Requests (`src/components/AllRequests.tsx`) — Items 8-13

- Add **"Submitted" column** (from `created_at`) between priority dot and service line
- Add **aging badge** (orange dot) on requests in "Requested" stage for 7+ days
- Add **"Contact" column** showing `contact_person`
- **Rename** "Target Date" → "Due Date"
- **Widen "Needed from Client"** column — allow text wrap instead of truncate
- **Default sort**: by `target_date` ascending, flexible/null dates to bottom
- **Request count**: "Showing X of Y requests" top-right, updates with filters

### 4. Calendar (`src/components/CalendarView.tsx`) — Items 14-17

- Calendar items already have content type background color; **add service line left border** (3px, using SERVICE_LINE_COLORS)
- Service line cards below calendar: **add colored left border** to card headers (already partially done via `borderLeftColor`, verify)
- **"Today" label** in the today cell alongside the date number
- **Stage dot** on each calendar item: small colored circle in corner using STAGE_COLORS

### 5. Submit Form (`src/components/SubmitForm.tsx`) — Item 18-19

- **Full-width "Send to Archway" button** with more padding (`py-3`, `w-full`)
- **Helper text** under Title: "This is what shows up in the calendar and request list"
- **"Not sure" dashed border** styling (already done — verify it's visually distinct)
- **Helper text** under Content Types: "Select what you think you need, or hit 'Not sure' and Archway will decide"
- **Updated placeholder** for "Do you have anything to share?": longer text about voice memo links, LinkedIn URLs
- **localStorage for "Your Name"**: save on change, initialize from localStorage
- **Post-submit message**: show toast with "Your request has been sent. You can track it on the All Requests tab."

### 6. Assets (`src/components/AssetsView.tsx`) — Items 20-22

- Add **Notes column** to assets table (needs DB column — add `notes text` to assets table via migration)
- ASAP due dates: **red bold**. Past-due non-received: **red + warning icon**
- "Blocking Content" indicator: show linked request title if `request_id` is set (fetch request data)
- Add **Service Line** column — requires adding `service_line text` to assets table via migration
- Empty state text: "No assets being tracked. Click + Add Asset to request something from the client."

### 7. Detail Modal (`src/components/DetailModal.tsx`) — Items 23-24

- **Restructured layout**: Title large at top, stage dropdown prominent, two-column date/owner layout
- **"Needed from Client" highlighted box**: light red background when populated
- **Submitted date** display (from `created_at`)
- **Auto-prompt for Actual Publish Date** when stage changed to "Published": show inline date picker prompt, allow skip
- **Delete button at bottom**, small and red

### 8. App Header (`src/components/AppHeader.tsx`) — Items 25, 27

- **Notification badge** on Dashboard tab showing count of items needing client action (pass count as prop from Index.tsx)
- **"Archway Digital" text**: remove orange color, make plain text (`text-primary-foreground/70`)

### 9. Empty States (Item 26) — across multiple files

- All Requests: "No requests match your filters" (already has similar)
- Published: "Nothing published yet. Content moves here when Archway marks it as Published."
- Assets: "No assets being tracked. Click + Add Asset to request something from the client."
- Calendar: "No content scheduled for [month]. Submit a request to get started."

### Database Migration

Add to `assets` table:
- `notes text` — nullable
- `service_line text` — nullable

### Files to modify

1. `src/lib/constants.ts` — add STAGE_COLORS
2. `src/components/Dashboard.tsx` — items 1-6
3. `src/components/AllRequests.tsx` — items 8-13
4. `src/components/CalendarView.tsx` — items 14-17
5. `src/components/SubmitForm.tsx` — items 18-19
6. `src/components/AssetsView.tsx` — items 20-22
7. `src/components/DetailModal.tsx` — items 23-24
8. `src/components/AppHeader.tsx` — items 25, 27
9. `src/pages/Index.tsx` — pass needsClientAction count to AppHeader
10. Migration for assets table columns

### Technical Notes

- Item 7 (service line name mismatch "Advisory" vs "Insurance"): This is a data issue in the seeded records, not a code bug. The constants already have correct names. Will not change code for this.
- Item 21 (blocking content indicator): Will show linked request title when `request_id` is populated on an asset. This is an existing FK column.
- The notification badge count requires `useRequests` to be called in Index.tsx and passed down to AppHeader.

