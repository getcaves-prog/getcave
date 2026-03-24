-- Create flyers bucket (public, 5MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('flyers', 'flyers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Create avatars bucket (public, 2MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Storage policies for flyers
CREATE POLICY "Public flyer access" ON storage.objects FOR SELECT USING (bucket_id = 'flyers');
CREATE POLICY "Auth users upload flyers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'flyers' AND auth.role() = 'authenticated');
CREATE POLICY "Users delete own flyers" ON storage.objects FOR DELETE USING (bucket_id = 'flyers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars
CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth users upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
