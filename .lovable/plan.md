

## Plan: Seed Database with Sample Requests

Insert 6 sample requests into the `requests` table using the database insert tool. Each request maps to the fields described, using the new `date_mode`, `flexible_date_text`, `has_hard_deadline`, `deadline_text`, and `contact_person` columns.

### Data to Insert

All 6 March 2026 requests with their specific field mappings:

1. **Welcome to Stable Rock** — LinkedIn Post, General/Stable Rock, specific date 03/10, High, In Progress, owner Archway
2. **IM Launch Announcement** — LinkedIn Post, Investment Management, flexible date, High, Requested, hard deadline (IM launch TBD)
3. **IM Services Landing Page** — Landing Page, Investment Management, flexible date, High, In Progress, owner Kevin + Archway
4. **What Is Independent Investment Management?** — SEO Article, Investment Management, specific date 03/28, Medium, Requested
5. **Greg's Market Commentary** — LinkedIn Post, General/Stable Rock, specific date 03/24, Medium, Requested
6. **Welcome Email Sequence** — Email Nurture, General/Stable Rock, specific date 03/20, Medium, Requested

### Technical Approach

Single SQL INSERT with 6 rows using the `supabase--read_query` insert tool. All new columns (`date_mode`, `flexible_date_text`, `has_hard_deadline`, `deadline_text`, `contact_person`) will be populated correctly per each request's specs.

No code changes needed — just data insertion.

