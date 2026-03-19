ALTER TABLE public.creatives
  ADD COLUMN IF NOT EXISTS article_title text,
  ADD COLUMN IF NOT EXISTS target_keyword text,
  ADD COLUMN IF NOT EXISTS subject_line text,
  ADD COLUMN IF NOT EXISTS body_content text,
  ADD COLUMN IF NOT EXISTS page_url text,
  ADD COLUMN IF NOT EXISTS event_location text,
  ADD COLUMN IF NOT EXISTS event_date text;