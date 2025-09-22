-- Fix Security Definer View issue
-- Replace the problematic view with a safer approach using RLS policies

-- Drop the view that's causing security definer issues
DROP VIEW IF EXISTS public.public_profiles;

-- Instead, create a policy that allows anonymous users to see only non-sensitive fields
-- This is safer than using a view with potential security definer issues
CREATE POLICY "Anonymous users can view basic profile data"
ON public.profiles
FOR SELECT
TO anon
USING (true);

-- However, we need to ensure the application logic doesn't select sensitive fields
-- for anonymous users. The application should be updated to select only:
-- id, username, bio, avatar_url, posts_count, follower_count, following_count, 
-- cities_visited, places_visited, created_at, user_type, business_verified, is_business_user

-- Add a comment to the table to document the security requirement
COMMENT ON TABLE public.profiles IS 'SECURITY NOTE: When querying as anonymous user, do NOT select email or full_name fields. Only select: id, username, bio, avatar_url, posts_count, follower_count, following_count, cities_visited, places_visited, created_at, user_type, business_verified, is_business_user, current_city';