
-- Fix #1: Secure RLS policies for all tables

-- REQUESTS: Drop open policies, create authenticated ones
DROP POLICY IF EXISTS "Anyone can view requests" ON public.requests;
DROP POLICY IF EXISTS "Anyone can insert requests" ON public.requests;
DROP POLICY IF EXISTS "Anyone can update requests" ON public.requests;
DROP POLICY IF EXISTS "Anyone can delete requests" ON public.requests;

CREATE POLICY "Authenticated users can view requests" ON public.requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert requests" ON public.requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update requests" ON public.requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete requests" ON public.requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ASSETS: Drop open policies, create authenticated ones
DROP POLICY IF EXISTS "Anyone can view assets" ON public.assets;
DROP POLICY IF EXISTS "Anyone can insert assets" ON public.assets;
DROP POLICY IF EXISTS "Anyone can update assets" ON public.assets;
DROP POLICY IF EXISTS "Anyone can delete assets" ON public.assets;

CREATE POLICY "Authenticated users can view assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update assets" ON public.assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete assets" ON public.assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- COMMENTS: Drop open policies, create authenticated ones
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;

CREATE POLICY "Authenticated users can view comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Only admins can delete comments" ON public.comments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- FILE_REFERENCES: Drop open policies, create authenticated ones
DROP POLICY IF EXISTS "Anyone can insert files" ON public.file_references;
DROP POLICY IF EXISTS "Anyone can view files" ON public.file_references;

CREATE POLICY "Authenticated users can view files" ON public.file_references FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert files" ON public.file_references FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Only admins can delete files" ON public.file_references FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CREATIVES: Drop open policies, create authenticated ones
DROP POLICY IF EXISTS "Anyone can view creatives" ON public.creatives;
DROP POLICY IF EXISTS "Anyone can insert creatives" ON public.creatives;
DROP POLICY IF EXISTS "Anyone can update creatives" ON public.creatives;
DROP POLICY IF EXISTS "Anyone can delete creatives" ON public.creatives;

CREATE POLICY "Authenticated users can view creatives" ON public.creatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert creatives" ON public.creatives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update creatives" ON public.creatives FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete creatives" ON public.creatives FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix #2 & #3: Add missing columns
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS linkedin_post_url TEXT;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Enable realtime for Fix #5
ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.creatives;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
