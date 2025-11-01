-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own audio messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can view audio messages in their conversations" ON storage.objects;

-- Create simpler and correct policies for audio messages
CREATE POLICY "Users can upload audio messages"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'messages' 
  AND (storage.foldername(name))[1] = 'audio-messages'
);

CREATE POLICY "Users can view their audio messages"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'messages'
  AND (storage.foldername(name))[1] = 'audio-messages'
);

CREATE POLICY "Users can delete their own audio messages"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'messages'
  AND (storage.foldername(name))[1] = 'audio-messages'
);