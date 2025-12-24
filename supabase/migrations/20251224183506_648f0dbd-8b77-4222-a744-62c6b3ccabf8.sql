-- Ensure requester can cancel their pending follow/friend request
-- (Fixes "Richiesta" staying active because DELETE was blocked by RLS)

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'friend_requests'
      AND policyname = 'Friend requests: requester can delete pending'
  ) THEN
    CREATE POLICY "Friend requests: requester can delete pending"
    ON public.friend_requests
    FOR DELETE
    USING (
      auth.uid() = requester_id
      AND status = 'pending'
    );
  END IF;
END $$;