-- Fix remaining security issues from linter

-- 1. Fix Security Definer View issue by dropping the problematic view
-- and creating safer access patterns
DROP VIEW IF EXISTS public.safe_profiles;

-- Instead, create a security definer function for safe profile access
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
SECURITY DEFINER
STABLE
SET search_path = public
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

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_safe_profile_data TO anon;
GRANT EXECUTE ON FUNCTION public.get_safe_profile_data TO authenticated;

-- 2. Fix remaining functions with mutable search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  DELETE FROM stories WHERE expires_at < now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_friend_request_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Add mutual follow relationship
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (NEW.requester_id, NEW.requested_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (NEW.requested_id, NEW.requester_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    
    -- Create notification for the requester
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      'Friend Request Accepted',
      'Your friend request has been accepted!',
      jsonb_build_object('friend_id', NEW.requested_id)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_location_of_the_week()
RETURNS TABLE(
  location_id uuid, 
  location_name text, 
  location_category text, 
  location_address text, 
  latitude numeric, 
  longitude numeric, 
  image_url text, 
  total_likes integer, 
  total_saves integer, 
  total_score integer
)
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.category,
    l.address,
    l.latitude,
    l.longitude,
    l.image_url,
    COALESCE(wlm.likes_count, 0) as total_likes,
    COALESCE(wlm.saves_count, 0) as total_saves,
    COALESCE(wlm.likes_count * 2 + wlm.saves_count, 0) as total_score
  FROM public.locations l
  LEFT JOIN public.weekly_location_metrics wlm ON l.id = wlm.location_id 
    AND wlm.week_start = DATE_TRUNC('week', CURRENT_DATE)
  WHERE l.category ILIKE '%library%' 
    OR l.category ILIKE '%book%'
    OR l.name ILIKE '%library%'
    OR l.name ILIKE '%book%'
  ORDER BY total_score DESC, total_likes DESC
  LIMIT 1;
END;
$function$;