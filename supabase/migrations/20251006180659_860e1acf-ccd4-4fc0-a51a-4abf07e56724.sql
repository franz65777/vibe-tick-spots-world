-- Add tagged_users column to posts table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'tagged_users'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.posts 
    ADD COLUMN tagged_users uuid[] DEFAULT '{}';
    
    CREATE INDEX IF NOT EXISTS idx_posts_tagged_users ON public.posts USING GIN (tagged_users);
  END IF;
END $$;