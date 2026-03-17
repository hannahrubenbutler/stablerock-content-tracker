ALTER TABLE public.requests
  ADD COLUMN date_mode text DEFAULT 'specific',
  ADD COLUMN date_range_end date,
  ADD COLUMN flexible_date_text text,
  ADD COLUMN has_hard_deadline boolean DEFAULT false,
  ADD COLUMN deadline_text text,
  ADD COLUMN contact_person text,
  ADD COLUMN actual_publish_date date;