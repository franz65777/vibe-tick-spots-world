-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_safe_profile_data(uuid);

-- Recreate with privacy fields
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
  current_city text,
  is_private boolean,
  been_cards_visibility text
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
    p.current_city,
    COALESCE(ups.is_private, false) as is_private,
    COALESCE(ups.been_cards_visibility, 'everyone') as been_cards_visibility
  FROM public.profiles p
  LEFT JOIN public.user_privacy_settings ups ON ups.user_id = p.id
  WHERE p.id = profile_id;
$$;

-- Create function to check if user can view another user's content
CREATE OR REPLACE FUNCTION public.can_view_user_content(viewer_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_is_private boolean;
  is_follower boolean;
BEGIN
  -- Same user can always view their own content
  IF viewer_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Check if target user is private
  SELECT COALESCE(ups.is_private, false)
  INTO target_is_private
  FROM public.profiles p
  LEFT JOIN public.user_privacy_settings ups ON ups.user_id = p.id
  WHERE p.id = target_user_id;
  
  -- If not private, anyone can view
  IF NOT target_is_private THEN
    RETURN true;
  END IF;
  
  -- If private, check if viewer follows target
  SELECT EXISTS(
    SELECT 1 FROM public.follows f
    WHERE f.follower_id = viewer_id 
    AND f.following_id = target_user_id
  ) INTO is_follower;
  
  RETURN is_follower;
END;
$$;

-- Create function to check if user can view another user's been cards
CREATE OR REPLACE FUNCTION public.can_view_been_cards(viewer_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  visibility text;
  is_follower boolean;
BEGIN
  -- Same user can always view their own content
  IF viewer_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get visibility setting
  SELECT COALESCE(ups.been_cards_visibility, 'everyone')
  INTO visibility
  FROM public.profiles p
  LEFT JOIN public.user_privacy_settings ups ON ups.user_id = p.id
  WHERE p.id = target_user_id;
  
  -- Check based on visibility setting
  IF visibility = 'everyone' THEN
    RETURN true;
  ELSIF visibility = 'none' THEN
    RETURN false;
  ELSIF visibility = 'followers' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = viewer_id 
      AND f.following_id = target_user_id
    ) INTO is_follower;
    RETURN is_follower;
  END IF;
  
  RETURN false;
END;
$$;

-- Create function to check for pending follow requests
CREATE OR REPLACE FUNCTION public.get_follow_request_status(requester_id uuid, requested_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT status::text
  FROM public.friend_requests
  WHERE friend_requests.requester_id = $1
  AND friend_requests.requested_id = $2
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_safe_profile_data TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_view_user_content TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_view_been_cards TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_follow_request_status TO authenticated, anon;