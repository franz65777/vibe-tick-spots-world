-- Ensure RLS and policies for post_likes so users can like/unlike posts
DO $$ BEGIN
  -- Enable RLS if not already
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.nspname = t.schemaname
    WHERE t.schemaname = 'public' AND t.tablename = 'post_likes' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Create manage-own policy (INSERT/UPDATE/DELETE)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_likes' AND policyname='Users can manage their own post likes'
  ) THEN
    CREATE POLICY "Users can manage their own post likes"
    ON public.post_likes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Create read policy for everyone (or restrict later)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_likes' AND policyname='Users can view all post likes'
  ) THEN
    CREATE POLICY "Users can view all post likes"
    ON public.post_likes
    FOR SELECT
    USING (true);
  END IF;
END $$;