-- Fix security vulnerability: Restrict public access to sensitive profile data
-- Remove overly permissive policies that expose email and personal data

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Allow users to view their own complete profile data
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow authenticated users to view other users' profiles
-- This maintains app functionality while requiring authentication
CREATE POLICY "Authenticated users can view profiles"  
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create a public view that excludes sensitive data (email, full_name)
-- for any unauthenticated access needs
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    id,
    username,
    bio,
    avatar_url,
    posts_count,
    follower_count,
    following_count,
    cities_visited,
    places_visited,
    created_at,
    user_type,
    business_verified,
    is_business_user,
    current_city
FROM public.profiles;

-- Grant access to the public view for anonymous users
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;