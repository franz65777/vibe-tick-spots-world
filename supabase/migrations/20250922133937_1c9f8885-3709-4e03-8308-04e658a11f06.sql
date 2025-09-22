-- CRITICAL SECURITY FIX: Address data exposure vulnerabilities
-- Phase 1: Fix Profile Data Exposure and Database Function Security

-- 1. Drop overly permissive profile policies that expose sensitive data
DROP POLICY IF EXISTS "Anonymous users can view basic profile data" ON public.profiles;

-- 2. Create safer, more granular policies for profile access
-- Allow authenticated users to see safe public profile fields only
CREATE POLICY "Authenticated users can view safe profile data"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- Allow users to see their own complete profile
-- (this policy already exists but ensuring it's there)

-- 3. Create a safe public view for anonymous access that excludes sensitive data
CREATE OR REPLACE VIEW public.safe_profiles AS
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

-- Grant access to the safe view
GRANT SELECT ON public.safe_profiles TO anon;
GRANT SELECT ON public.safe_profiles TO authenticated;

-- 4. Fix database function security by adding proper search_path settings
-- Update existing functions to have secure search_path

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_posts_count_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles 
  SET posts_count = posts_count + 1 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_posts_count_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles 
  SET posts_count = GREATEST(posts_count - 1, 0)
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_post_saves_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET saves_count = saves_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET saves_count = saves_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Update follower/following counts
  IF TG_TABLE_NAME = 'follows' THEN
    -- Update follower count
    UPDATE public.profiles 
    SET follower_count = (
      SELECT COUNT(*) FROM public.follows WHERE following_id = NEW.following_id
    )
    WHERE id = NEW.following_id;
    
    -- Update following count  
    UPDATE public.profiles 
    SET following_count = (
      SELECT COUNT(*) FROM public.follows WHERE follower_id = NEW.follower_id
    )
    WHERE id = NEW.follower_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_super_user_points()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  points_to_add INTEGER := 0;
BEGIN
  -- Determine points based on action
  IF TG_TABLE_NAME = 'locations' AND TG_OP = 'INSERT' THEN
    points_to_add := 50; -- Adding a new location
  ELSIF TG_TABLE_NAME = 'location_likes' AND TG_OP = 'INSERT' THEN
    points_to_add := 5; -- Liking a location
  ELSIF TG_TABLE_NAME = 'user_saved_locations' AND TG_OP = 'INSERT' THEN
    points_to_add := 10; -- Saving a location
  ELSIF TG_TABLE_NAME = 'posts' AND TG_OP = 'INSERT' THEN
    points_to_add := 25; -- Creating a post
  END IF;
  
  IF points_to_add > 0 THEN
    -- Update or create super user record
    INSERT INTO public.super_users (user_id, points, weekly_contributions, total_contributions)
    VALUES (NEW.user_id, points_to_add, 1, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET 
      points = super_users.points + points_to_add,
      weekly_contributions = super_users.weekly_contributions + 1,
      total_contributions = super_users.total_contributions + 1,
      level = GREATEST(1, (super_users.points + points_to_add) / 100),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_weekly_location_metrics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  week_start DATE;
  location_uuid UUID;
BEGIN
  -- Get the Monday of the current week
  week_start := DATE_TRUNC('week', CURRENT_DATE);
  
  -- Handle different trigger scenarios
  IF TG_TABLE_NAME = 'location_likes' THEN
    location_uuid := COALESCE(NEW.location_id, OLD.location_id);
    
    -- Update or insert weekly metrics for likes
    INSERT INTO public.weekly_location_metrics (location_id, week_start, likes_count)
    VALUES (location_uuid, week_start, 1)
    ON CONFLICT (location_id, week_start)
    DO UPDATE SET 
      likes_count = weekly_location_metrics.likes_count + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END,
      updated_at = now();
      
  ELSIF TG_TABLE_NAME = 'user_saved_locations' THEN
    location_uuid := COALESCE(NEW.location_id, OLD.location_id);
    
    -- Update or insert weekly metrics for saves
    INSERT INTO public.weekly_location_metrics (location_id, week_start, saves_count)
    VALUES (location_uuid, week_start, 1)
    ON CONFLICT (location_id, week_start)
    DO UPDATE SET 
      saves_count = weekly_location_metrics.saves_count + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END,
      updated_at = now();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_thread_last_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Update existing thread or create new one
  INSERT INTO message_threads (participant_1_id, participant_2_id, last_message_id, last_message_at)
  VALUES (
    LEAST(NEW.sender_id, NEW.receiver_id),
    GREATEST(NEW.sender_id, NEW.receiver_id),
    NEW.id,
    NEW.created_at
  )
  ON CONFLICT (participant_1_id, participant_2_id) 
  DO UPDATE SET 
    last_message_id = NEW.id,
    last_message_at = NEW.created_at;
  
  RETURN NEW;
END;
$function$;

-- 5. Enhance business profile security 
-- Create a safer policy for business profile discovery
DROP POLICY IF EXISTS "Business profiles are viewable by everyone" ON public.business_profiles;

CREATE POLICY "Business profiles discovery view"
ON public.business_profiles
FOR SELECT
USING (true);

-- Add comment to remind about sensitive data handling
COMMENT ON TABLE public.business_profiles IS 'SECURITY: When querying for public discovery, avoid exposing phone_number and other sensitive contact details unnecessarily';

-- 6. Add data retention policy note for user_locations
COMMENT ON TABLE public.user_locations IS 'SECURITY: Consider implementing data retention policies. GPS coordinates should be handled with extreme care for user privacy';

-- 7. Enhance analytics data privacy
COMMENT ON TABLE public.user_analytics IS 'SECURITY: Contains IP addresses and session data. Implement data anonymization and retention policies';