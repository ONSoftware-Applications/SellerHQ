-- Fix overly permissive storage RLS policies
-- Drop existing policies and recreate with ownership checks

DROP POLICY IF EXISTS "Users can upload product photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read product photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their product photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their product photos" ON storage.objects;

-- Anyone authenticated can upload to their own folder (user_id as first path segment)
CREATE POLICY "Users can upload product photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Any authenticated user can read product photos (needed for shared listings)
CREATE POLICY "Authenticated users can read product photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
  );

-- Only the owner can update their own photos
CREATE POLICY "Users can update their own product photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Only the owner can delete their own photos
CREATE POLICY "Users can delete their own product photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
