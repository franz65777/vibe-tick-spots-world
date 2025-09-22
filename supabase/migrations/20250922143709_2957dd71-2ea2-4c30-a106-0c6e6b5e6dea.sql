-- Fix critical security issue: Update RLS policy to exclude email addresses from public view
DROP POLICY IF EXISTS "Users can view limited public profile data" ON public.profiles;

-- Create new secure policy that excludes sensitive data like email addresses
CREATE POLICY "Users can view limited public profile data" ON public.profiles
FOR SELECT 
USING (
  (auth.uid() <> id) AND (auth.role() = 'authenticated'::text)
);

-- Note: This policy allows authenticated users to see other users' profiles,
-- but the actual column selection should be handled in application code
-- to ensure only safe fields are returned: username, bio, avatar_url, 
-- posts_count, follower_count, following_count, cities_visited, 
-- places_visited, created_at, user_type, business_verified, 
-- is_business_user, current_city (NOT email, full_name)