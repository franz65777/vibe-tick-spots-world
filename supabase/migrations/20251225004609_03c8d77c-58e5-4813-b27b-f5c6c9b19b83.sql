-- Enable full replica identity for friend_requests to support real-time updates
ALTER TABLE public.friend_requests REPLICA IDENTITY FULL;

-- Add friend_requests to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'friend_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
  END IF;
END $$;