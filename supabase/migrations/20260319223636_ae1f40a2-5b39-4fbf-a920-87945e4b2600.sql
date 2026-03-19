ALTER TABLE public.creatives
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_file_name text;