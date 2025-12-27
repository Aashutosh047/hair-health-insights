-- Storage bucket RLS policies for assessment-images
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assessment-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assessment-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'assessment-images' AND (storage.foldername(name))[1] = auth.uid()::text);