-- Expand allowed message_type values for direct_messages to support folder and story sharing
ALTER TABLE public.direct_messages
  DROP CONSTRAINT IF EXISTS direct_messages_message_type_check;

ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_message_type_check
  CHECK (message_type IN (
    'text',
    'place_share',
    'trip_share',
    'post_share',
    'profile_share',
    'audio',
    'story_reply',
    'story_share',
    'folder_share'
  ));