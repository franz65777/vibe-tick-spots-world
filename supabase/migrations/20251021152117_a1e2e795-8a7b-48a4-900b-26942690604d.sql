-- Add location_id to direct_messages to separate business from personal messages
ALTER TABLE direct_messages 
ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_direct_messages_location_id ON direct_messages(location_id);

-- Add message_context to distinguish business vs personal messages
ALTER TABLE direct_messages 
ADD COLUMN message_context text DEFAULT 'personal' CHECK (message_context IN ('personal', 'business'));

-- Update RLS policies to allow business owners to see business-related messages
CREATE POLICY "Business owners can view location messages"
ON direct_messages
FOR SELECT
USING (
  -- User is the receiver
  auth.uid() = receiver_id
  -- And either it's a personal message or they own the location
  AND (
    message_context = 'personal'
    OR (
      message_context = 'business' 
      AND location_id IN (
        SELECT id FROM locations WHERE claimed_by = auth.uid()
      )
    )
  )
);
