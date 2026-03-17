

## Plan: Comprehensive Feature Upgrades for Stable Rock Content Tracker

This is a large set of improvements across every tab. I'll break it into logical work items.

---

### 1. Submit Tab — File Upload Support

**Current state**: No file upload on submit form. Files can only be uploaded via DetailModal after a request exists.

**Change**: Add a file upload area to `SubmitForm.tsx`. Since file_references require a `request_id`, the flow will be:
- Let users select files in the form (held in local state)
- After each request is created, upload the selected files to Supabase Storage and insert file_references linked to the new request ID
- Show selected file names with remove buttons before submission
- Accept images, PDFs, docs (`.jpg,.png,.gif,.pdf,.doc,.docx,.pptx,.xlsx`)
- Change "Other" default content type when none selected (currently uses "General")

### 2. Submit Tab — Default Content Type Fix

**Current**: Uses "General" when no types checked. **Change**: Use "Other" per spec.

### 3. Dashboard — "This Week" Logic Fix

**Current**: Uses `startOfWeek`/`endOfWeek` (calendar week). Doesn't exclude Published.
**Change**: Filter to requests with target_date within next 7 days from today, excluding stage === "Published".

### 4. Dashboard — "Needs Client Action" Logic Fix

**Current**: Includes requests where stage is "Needs Info" or "Client Review" OR `what_needed_from_client` is non-empty (no Published exclusion).
**Change**: Only show requests where `what_needed_from_client` is non-empty AND stage !== "Published". Show content type badge, title, what's needed, and stage.

### 5. Dashboard — Monthly Grid Zero Styling

**Current**: Zeros show as "–". **Change**: Keep "–" but style with `text-muted-foreground/50` or `opacity-40` to make gaps visually obvious.

### 6. All Requests — Attachment & Comment Count Indicators

**Problem**: No way to see at a glance which requests have files or comments without opening the modal.

**Change**: 
- Create a new hook `useRequestCounts()` that fetches comment and file counts per request (using Supabase count queries or batch fetching)
- Show paperclip icon + count and comment icon + count in the table row
- Add Event/Promo Date red badge in the row

### 7. All Requests — Priority Column Visual

**Current**: Priority dot exists but colors may not match spec (red=High, yellow=Medium, gray=Low).
**Change**: Verify `PRIORITY_COLORS` mapping. Current: High=#C0392B (red), Medium=#F48021 (orange). Change Medium to yellow-ish, Low to gray.

### 8. Detail Modal — Image Thumbnails

**Current**: Files shown as text links. **Change**: For image file types, render `<img>` thumbnail previews. Keep link for non-images.

### 9. Detail Modal — Full Screen on Mobile

**Current**: Modal is a centered overlay. **Change**: On mobile (`md:` breakpoint), make modal full-screen with `inset-0` and scrollable content.

### 10. Assets Tab — Status Count Cards + Due Date + ASAP Red

**Current**: No status count cards, no due date field. 
**Change**: 
- Add a migration to add `due_date` column to assets table
- Add status count cards at top (like dashboard stage cards)
- Show ASAP/overdue dates in red
- Add `assigned_to` and `due_date` fields to the add form

### 11. Header — Mobile Nav Horizontal Scroll

**Current**: Mobile nav is a hamburger dropdown (vertical). **Change**: Replace with horizontally scrollable tab bar on mobile using `overflow-x-auto whitespace-nowrap flex`. Remove hamburger.

### 12. Calendar — Content Type Badges in Service Line Cards

**Current**: Service line cards below calendar show title + date. **Change**: Add content type badge to each item.

---

### Technical Details

**Database migration needed**: Add `due_date text` column to `assets` table.

**New hook — `useRequestMetaCounts`**: Batch-fetch comment counts and file counts for all requests to display in the All Requests table. This avoids N+1 queries. Implementation: two separate queries — `select request_id, count(*) from comments group by request_id` and same for file_references. Since Supabase JS doesn't support raw GROUP BY easily, we'll fetch all comments/file_references and count client-side, or use `.select('request_id')` and count in JS.

**Files to modify**:
- `src/components/SubmitForm.tsx` — add file upload area, fix "Other" default
- `src/components/Dashboard.tsx` — fix This Week logic (next 7 days, exclude Published), fix Needs Client Action (only what_needed_from_client non-empty + not Published), muted zeros
- `src/components/AllRequests.tsx` — add attachment/comment indicators, event/promo date badge, fix priority colors
- `src/components/DetailModal.tsx` — image thumbnails, mobile full-screen
- `src/components/AssetsView.tsx` — status count cards, due date field, ASAP styling, expanded add form
- `src/components/CalendarView.tsx` — content type badges in grouped cards
- `src/components/AppHeader.tsx` — horizontal scroll nav on mobile
- `src/hooks/useData.ts` — add useRequestMetaCounts hook
- `src/lib/constants.ts` — update Medium priority color to yellow
- Migration: add `due_date` to assets

