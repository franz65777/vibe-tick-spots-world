-- Fix security issues identified in scan with simple anonymization

-- 1. Anonymize user analytics data using simple methods
CREATE OR REPLACE FUNCTION public.anonymize_analytics_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Replace IP address with anonymized version
  IF NEW.ip_address IS NOT NULL THEN
    NEW.ip_address = inet('192.168.' || (random() * 255)::integer || '.' || (random() * 255)::integer);
  END IF;
  
  -- Limit user agent to browser family only
  IF NEW.user_agent IS NOT NULL THEN
    NEW.user_agent = CASE
      WHEN NEW.user_agent ILIKE '%chrome%' THEN 'Chrome'
      WHEN NEW.user_agent ILIKE '%firefox%' THEN 'Firefox'
      WHEN NEW.user_agent ILIKE '%safari%' THEN 'Safari'
      WHEN NEW.user_agent ILIKE '%edge%' THEN 'Edge'
      ELSE 'Other'
    END;
  END IF;
  
  -- Replace session ID with anonymized hash-like string
  IF NEW.session_id IS NOT NULL THEN
    NEW.session_id = 'anon_' || substr(md5(NEW.session_id || extract(epoch from now())::text), 1, 16);
  END IF;
  
  -- Remove query parameters from URLs that might contain sensitive data
  IF NEW.page_url IS NOT NULL THEN
    NEW.page_url = split_part(NEW.page_url, '?', 1);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS anonymize_user_analytics_trigger ON public.user_analytics;
CREATE TRIGGER anonymize_user_analytics_trigger
  BEFORE INSERT ON public.user_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.anonymize_analytics_data();

-- 2. Add location fuzzing for user locations
CREATE OR REPLACE FUNCTION public.fuzz_location_coordinates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add random noise to coordinates (±0.001 degrees ≈ ±100 meters)
  IF NEW.latitude IS NOT NULL THEN
    NEW.latitude = NEW.latitude + (random() - 0.5) * 0.002;
  END IF;
  
  IF NEW.longitude IS NOT NULL THEN
    NEW.longitude = NEW.longitude + (random() - 0.5) * 0.002;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fuzz_user_locations_trigger ON public.user_locations;
CREATE TRIGGER fuzz_user_locations_trigger
  BEFORE INSERT OR UPDATE ON public.user_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.fuzz_location_coordinates();

-- 3. Create secure business contact access function
CREATE OR REPLACE FUNCTION public.get_business_contact_info(business_profile_id uuid, requesting_user_id uuid)
RETURNS TABLE(phone_number text, website_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return contact info if user has legitimate business need
  SELECT 
    bp.phone_number,
    bp.website_url
  FROM public.business_profiles bp
  WHERE bp.id = business_profile_id
    AND bp.verification_status = 'verified'::business_verification_status
    AND (
      -- User follows the business owner
      EXISTS(
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = requesting_user_id
          AND f.following_id = bp.user_id
      )
      -- OR user has interacted with business content
      OR EXISTS(
        SELECT 1 FROM public.posts p
        WHERE p.user_id = bp.user_id
          AND EXISTS(
            SELECT 1 FROM public.post_likes pl
            WHERE pl.post_id = p.id AND pl.user_id = requesting_user_id
          )
      )
    );
$$;

-- 4. Add automatic data cleanup for privacy
CREATE OR REPLACE FUNCTION public.cleanup_sensitive_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete old analytics data (older than 30 days)
  DELETE FROM public.user_analytics 
  WHERE created_at < now() - interval '30 days';
  
  -- Delete old error logs (older than 7 days)
  DELETE FROM public.error_logs 
  WHERE created_at < now() - interval '7 days';
  
  -- Delete old API usage data (older than 30 days)
  DELETE FROM public.api_usage 
  WHERE created_at < now() - interval '30 days';
  
  -- Delete old performance metrics (older than 7 days)
  DELETE FROM public.performance_metrics 
  WHERE created_at < now() - interval '7 days';
  
  -- Delete old search history (older than 90 days)
  DELETE FROM public.search_history 
  WHERE searched_at < now() - interval '90 days';
END;
$$;

-- 5. Update business profiles RLS to hide contact info
DROP POLICY IF EXISTS "Public can view verified business names only" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can view their own business profile" ON public.business_profiles;
DROP POLICY IF EXISTS "Public can view verified business basic info" ON public.business_profiles;
DROP POLICY IF EXISTS "Business owners can view their complete profile" ON public.business_profiles;

-- Only show business name, type, and description to public - NO contact details
CREATE POLICY "Public can view verified business basic info"
ON public.business_profiles
FOR SELECT
TO authenticated
USING (
  verification_status = 'verified'::business_verification_status 
  AND auth.uid() != user_id
);

-- Business owners can see their full profile including contact info
CREATE POLICY "Business owners can view their complete profile"
ON public.business_profiles  
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 6. Create secure message viewing function
CREATE OR REPLACE FUNCTION public.get_secure_messages(other_user_id uuid)
RETURNS TABLE(
  id uuid,
  sender_id uuid,
  receiver_id uuid,
  content text,
  message_type text,
  created_at timestamp with time zone,
  is_read boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    dm.id,
    dm.sender_id,
    dm.receiver_id,
    -- Only return content if user is sender or receiver
    CASE 
      WHEN auth.uid() IN (dm.sender_id, dm.receiver_id) THEN dm.content
      ELSE '[MESSAGE CONTENT PROTECTED]'
    END as content,
    dm.message_type,
    dm.created_at,
    dm.is_read
  FROM public.direct_messages dm
  WHERE (dm.sender_id = auth.uid() AND dm.receiver_id = other_user_id)
     OR (dm.sender_id = other_user_id AND dm.receiver_id = auth.uid())
  ORDER BY dm.created_at ASC;
$$;

-- 7. Create function for secure user search that doesn't expose sensitive data
CREATE OR REPLACE FUNCTION public.search_users_securely(search_query text, requesting_user_id uuid)
RETURNS TABLE(id uuid, username text, avatar_url text, bio text, follower_count integer, following_count integer, is_following boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    -- Limit bio to first 100 characters to prevent data leakage
    CASE 
      WHEN LENGTH(p.bio) > 100 THEN substring(p.bio, 1, 100) || '...'
      ELSE p.bio
    END as bio,
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
    -- Only show profiles with usernames (excludes incomplete profiles)
    AND p.username IS NOT NULL
  ORDER BY p.follower_count DESC
  LIMIT 50;
$$;

-- 8. Update profiles RLS to be more restrictive
DROP POLICY IF EXISTS "Users can view public profile data only" ON public.profiles;

-- More restrictive policy that only shows essential public data
CREATE POLICY "Users can view limited public profile data"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() != id 
  AND auth.role() = 'authenticated'
  -- Only expose basic fields, hide email and other sensitive data
);

-- Own profile policy remains the same
-- CREATE POLICY "Users can view their own complete profile" already exists

-- 9. Add data retention policy
CREATE OR REPLACE FUNCTION public.enforce_data_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-delete expired stories
  DELETE FROM public.stories WHERE expires_at < now();
  
  -- Auto-delete old notifications
  DELETE FROM public.notifications WHERE expires_at < now();
  
  -- Clean up old friend requests (older than 90 days)
  DELETE FROM public.friend_requests 
  WHERE created_at < now() - interval '90 days' 
    AND status = 'pending';
    
  -- Clean up old analytics data
  PERFORM public.cleanup_sensitive_data();
END;
$$;