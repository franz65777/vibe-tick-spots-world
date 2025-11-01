-- Create storage bucket for audio messages
INSERT INTO storage.buckets (id, name, public) 
VALUES ('messages', 'messages', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for messages bucket
CREATE POLICY "Users can upload their own audio messages"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'messages' 
  AND auth.uid()::text = (string_to_array(name, '_'))[1]
);

CREATE POLICY "Users can view audio messages in their conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'messages'
  AND (
    -- User is the sender
    auth.uid()::text = (string_to_array(name, '_'))[1]
    OR 
    -- User is involved in the conversation (check direct_messages table)
    EXISTS (
      SELECT 1 FROM direct_messages
      WHERE (sender_id = auth.uid() OR receiver_id = auth.uid())
      AND shared_content->>'audio_url' LIKE '%' || name || '%'
    )
  )
);