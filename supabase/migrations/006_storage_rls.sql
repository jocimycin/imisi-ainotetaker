-- 006_storage_rls.sql
-- RLS policies for the "recordings" Supabase Storage bucket.
-- Authenticated users can only read/write within their own {user_id}/ folder.
-- The service role (used for signed URL generation) bypasses RLS automatically.

-- Ensure the bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  false,
  524288000, -- 500 MB
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files into their own folder
-- Path format: {user_id}/{meeting_id}.webm  → foldername[1] = user_id
CREATE POLICY "recordings_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own recordings
CREATE POLICY "recordings_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own recordings
CREATE POLICY "recordings_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
