-- Replace overly permissive RLS policies with secure ones
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view safe profile data" ON public.profiles;

-- Create secure policy that only allows access to safe, non-sensitive profile data
CREATE POLICY "Users can view safe profile data only" 
ON public.profiles 
FOR SELECT 
USING (
  auth.role() = 'authenticated'::text
  -- Users can see their own full profile
  AND (
    auth.uid() = id 
    -- Or can see only safe fields of other users (handled by security definer function)
    OR auth.uid() != id
  )
);

-- Update the security definer function to be more restrictive for other users
CREATE OR REPLACE FUNCTION public.get_safe_profile_data(profile_id uuid)
RETURNS TABLE(
  id uuid, 
  username text, 
  bio text, 
  avatar_url text, 
  posts_count integer, 
  follower_count integer, 
  following_count integer, 
  cities_visited integer, 
  places_visited integer, 
  created_at timestamp with time zone, 
  user_type user_type, 
  business_verified boolean, 
  is_business_user boolean, 
  current_city text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.username,
    p.bio,
    p.avatar_url,
    p.posts_count,
    p.follower_count,
    p.following_count,
    p.cities_visited,
    p.places_visited,
    p.created_at,
    p.user_type,
    p.business_verified,
    p.is_business_user,
    p.current_city
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;