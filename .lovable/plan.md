

## Plan: Submit Form Redesign + New Date System

### Database Migration

Add new columns to the `requests` table:

- `date_mode text` — values: `'specific'`, `'range'`, `'flexible'` (default `'specific'`)
- `date_range_end date` — end date for range mode
- `flexible_date_text text` — free text for flexible mode (e.g. "sometime in April")
- `has_hard_deadline boolean` — default false
- `deadline_text text` — free text describing the deadline
- `contact_person text` — "who should we talk to about this?"
- `actual_publish_date date` — filled by Archway when content goes live

### Submit Form Redesign (`SubmitForm.tsx`)

Complete rewrite with new field order and behavior:

1. **Title** — single-line input (required), placeholder: "Give it a short name..."
2. **Service Line + Priority** — side by side. Service line optional, defaults to "General / Stable Rock" on submit
3. **Details / Context** — textarea (optional), replaces old "What do you need?" as context field
4. **Content Types** — existing checkboxes + new "Not sure" dashed-border button. "Not sure" deselects all others and vice versa. "Not sure" submits as "Other"
5. **Date Section** — three pill toggle buttons (Specific Date / Date Range / Flexible). Each shows different inputs:
   - Specific: one date picker labeled "Publish Date"
   - Range: two date pickers "Start" and "End"
   - Flexible: text input with placeholder
   - Below: checkbox "This is tied to a hard deadline or event" → reveals text field
6. **Who should we talk to?** — single line input
7. **Do you have anything to share?** — textarea (renamed from "Assets You Have")
8. **Attach Files** — existing file upload
9. **Your Name** — existing
10. **Send to Archway** — renamed submit button

Submit logic: `service_line` defaults to "General / Stable Rock" if empty. Maps `date_mode`, `target_date`, `date_range_end`, `flexible_date_text`, `has_hard_deadline`, `deadline_text`, `contact_person` to the insert.

### All Requests Table Updates

- Date Range requests: show target date + small badge "Mar 15 – Apr 15"
- Flexible requests: show "Flexible" in muted text if no target_date
- Hard deadline items: red badge with deadline text

### Calendar Updates

- Specific Date: shows on that date (unchanged)
- Date Range: shows on start date with a small range badge
- Flexible: doesn't appear on calendar until Archway assigns a target_date

### Detail Modal Updates

- Show new fields: date mode info, contact person, deadline info
- Add **Actual Publish Date** field (date picker, separate from requested date)
- In edit mode: allow editing all new fields

### Published View Updates

- Show `actual_publish_date` instead of `updated_at` when available
- Fall back to `updated_at` if no actual publish date set

### Files to modify
- **Migration**: new columns on `requests`
- `src/components/SubmitForm.tsx` — full rewrite
- `src/components/AllRequests.tsx` — date range badge, flexible text, deadline badge
- `src/components/CalendarView.tsx` — range badge on calendar items
- `src/components/DetailModal.tsx` — new fields, actual publish date
- `src/components/PublishedView.tsx` — use actual_publish_date
- `src/hooks/useData.ts` — no structural changes needed (generic insert/update)

### Technical Notes
- The `date_mode` column is `text` not an enum to avoid migration complexity; values validated in frontend
- `target_date` continues to be the primary date for calendar/sorting. For "range" mode it holds the start date. For "flexible" mode it stays null until Archway assigns one
- The `actual_publish_date` is independent of `target_date` — it's what Archway fills in when content is actually published

