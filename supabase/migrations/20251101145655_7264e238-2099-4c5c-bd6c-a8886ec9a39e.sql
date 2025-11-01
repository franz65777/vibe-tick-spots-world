-- Add is_business_post column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS is_business_post BOOLEAN DEFAULT false;

-- Create index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_posts_is_business_post 
ON public.posts(is_business_post) 
WHERE is_business_post = true;

-- Update existing posts from business accounts to mark them as business posts
-- Business accounts are identified by having a record in business_profiles table
UPDATE public.posts p
SET is_business_post = true
FROM public.business_profiles bp
WHERE p.user_id = bp.user_id;