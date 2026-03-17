
CREATE TABLE public.creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  graphic_url text,
  graphic_file_name text,
  caption text,
  platform text NOT NULL DEFAULT 'LinkedIn',
  scheduled_datetime timestamptz,
  status text NOT NULL DEFAULT 'Draft',
  approved_by text,
  approved_at timestamptz,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view creatives" ON public.creatives FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert creatives" ON public.creatives FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update creatives" ON public.creatives FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete creatives" ON public.creatives FOR DELETE TO public USING (true);

CREATE TRIGGER update_creatives_updated_at
  BEFORE UPDATE ON public.creatives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
