-- Fix foreign key relationships and ensure proper schema
-- Add foreign key constraint from posts to profiles if missing
DO $$ 
BEGIN
    -- Check if foreign key constraint exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_user_id_fkey' 
        AND table_name = 'posts'
    ) THEN
        ALTER TABLE public.posts 
        ADD CONSTRAINT posts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure profiles table has proper structure for relationships
ALTER TABLE public.profiles ALTER COLUMN id SET NOT NULL;

-- Add index for better performance on joins
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_location_id ON public.posts(location_id);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';