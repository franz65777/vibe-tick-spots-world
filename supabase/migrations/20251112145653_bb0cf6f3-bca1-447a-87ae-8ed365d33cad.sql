-- Allow users to create notifications for location shares
CREATE POLICY "Users can create location share notifications"
ON notifications
FOR INSERT
WITH CHECK (
  type = 'location_share' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
  )
);