DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'attachments');
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');
CREATE POLICY "Admins can delete attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'attachments' AND public.has_role(auth.uid(), 'admin'));