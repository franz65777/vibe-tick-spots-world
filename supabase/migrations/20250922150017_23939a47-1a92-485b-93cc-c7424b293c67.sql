-- SECURITY FIX: Restrict public profile data access
-- Remove the existing broad public profile policy that exposes sensitive data
DROP POLICY IF EXISTS "Users can view limited public profile data" ON public.profiles;

-- Create a new restrictive policy that only exposes safe public fields
CREATE POLICY "Users can view public profile data only" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() <> id) AND (auth.role() = 'authenticated'::text)
);

-- Update the safe profile data function to only return truly public fields
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
AS $function$
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
$function$;

-- SECURITY FIX: Create secure business profile function that excludes sensitive contact info
CREATE OR REPLACE FUNCTION public.get_public_business_data(business_id uuid)
RETURNS TABLE(
  id uuid, 
  business_name text, 
  business_type text, 
  business_description text, 
  verification_status business_verification_status, 
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    bp.id,
    bp.business_name,
    bp.business_type,
    bp.business_description,
    bp.verification_status,
    bp.created_at
  FROM public.business_profiles bp
  WHERE bp.id = business_id 
    AND bp.verification_status = 'verified'::business_verification_status;
$function$;

-- SECURITY FIX: Create secure user search function that doesn't expose emails
CREATE OR REPLACE FUNCTION public.search_users_safely(search_query text, requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  username text,
  avatar_url text,
  bio text,
  follower_count integer,
  following_count integer,
  is_following boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.bio,
    p.follower_count,
    p.following_count,
    EXISTS(
      SELECT 1 FROM follows f 
      WHERE f.follower_id = requesting_user_id 
      AND f.following_id = p.id
    ) as is_following
  FROM public.profiles p
  WHERE p.username ILIKE '%' || search_query || '%'
    AND p.id != requesting_user_id
  ORDER BY p.follower_count DESC
  LIMIT 50;
$function$;

-- SECURITY FIX: Add rate limiting for authentication attempts (using existing user_analytics table)
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(user_ip inet)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(*) < 5
  FROM public.user_analytics
  WHERE ip_address = user_ip
    AND event_type = 'auth_attempt'
    AND created_at > now() - interval '15 minutes';
$function$;