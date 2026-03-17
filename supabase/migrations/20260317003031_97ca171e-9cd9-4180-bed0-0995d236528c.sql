
-- Create enum types
CREATE TYPE public.request_stage AS ENUM ('Requested', 'Needs Info', 'In Progress', 'In Simplified', 'Client Review', 'Scheduled', 'Published', 'On Hold');
CREATE TYPE public.request_priority AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE public.asset_status AS ENUM ('Waiting', 'Blocking', 'Received', 'Partial');

-- Create requests table
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  service_line TEXT NOT NULL,
  content_type TEXT NOT NULL,
  stage request_stage NOT NULL DEFAULT 'Requested',
  priority request_priority NOT NULL DEFAULT 'Medium',
  target_date DATE,
  event_promo_date DATE,
  context TEXT,
  assets_available TEXT,
  submitter_name TEXT,
  owner TEXT,
  what_needed_from_client TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status asset_status NOT NULL DEFAULT 'Waiting',
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create file_references table
CREATE TABLE public.file_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_references ENABLE ROW LEVEL SECURITY;

-- Open access policies (no auth required for this shared tracker)
CREATE POLICY "Anyone can view requests" ON public.requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert requests" ON public.requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update requests" ON public.requests FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete requests" ON public.requests FOR DELETE USING (true);

CREATE POLICY "Anyone can view assets" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Anyone can insert assets" ON public.assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update assets" ON public.assets FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete assets" ON public.assets FOR DELETE USING (true);

CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON public.comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view files" ON public.file_references FOR SELECT USING (true);
CREATE POLICY "Anyone can insert files" ON public.file_references FOR INSERT WITH CHECK (true);

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);
CREATE POLICY "Anyone can view attachments" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
CREATE POLICY "Anyone can upload attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
