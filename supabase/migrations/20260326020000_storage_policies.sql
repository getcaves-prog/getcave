-- Storage policies for avatars and flyers buckets

-- Avatars: authenticated users can upload, everyone can read
CREATE POLICY "Allow avatar uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow avatar updates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow public avatar reads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Flyers: authenticated users can upload, everyone can read
CREATE POLICY "Allow flyer uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'flyers');

CREATE POLICY "Allow public flyer reads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'flyers');
