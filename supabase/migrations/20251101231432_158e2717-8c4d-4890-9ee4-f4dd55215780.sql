-- Drop existing check constraint on message_type
ALTER TABLE public.direct_messages 
DROP CONSTRAINT IF EXISTS direct_messages_message_type_check;

-- Add new check constraint that includes 'audio'
ALTER TABLE public.direct_messages 
ADD CONSTRAINT direct_messages_message_type_check 
CHECK (message_type IN ('text', 'place_share', 'trip_share', 'post_share', 'profile_share', 'audio'));