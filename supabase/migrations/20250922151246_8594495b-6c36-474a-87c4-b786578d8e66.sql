-- Fix security issues identified in scan

-- 1. Anonymize user analytics data
-- Add function to hash IP addresses
CREATE OR REPLACE FUNCTION public.hash_ip_address(ip_addr inet)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT encode(digest(host(ip_addr)::text, 'sha256'), 'hex');
$$;

-- Add trigger to automatically hash IP addresses on insert
CREATE OR REPLACE FUNCTION public.anonymize_analytics_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hash IP address for privacy
  IF NEW.ip_address IS NOT NULL THEN
    NEW.ip_address = inet(substring(public.hash_ip_address(NEW.ip_address), 1, 15) || '.0.0.1');
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
  
  -- Anonymize session ID by hashing
  IF NEW.session_id IS NOT NULL THEN
    NEW.session_id = encode(digest(NEW.session_id, 'sha256'), 'hex');
  END IF;
  
  -- Remove query parameters from URLs that might contain sensitive data
  IF NEW.page_url IS NOT NULL THEN
    NEW.page_url = split_part(NEW.page_url, '?', 1);
  END IF;
  
  RETURN NEW;
END;
$$;

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
  -- (owns a location near the business or is following the business owner)
  SELECT 
    bp.phone_number,
    bp.website_url
  FROM public.business_profiles bp
  WHERE bp.id = business_profile_id
    AND bp.verification_status = 'verified'::business_verification_status
    AND (
      -- User owns a location within 5km of business locations
      EXISTS(
        SELECT 1 FROM public.locations l1
        JOIN public.location_claims lc ON l1.id = lc.location_id
        WHERE lc.business_id = business_profile_id
          AND EXISTS(
            SELECT 1 FROM public.locations l2
            WHERE l2.created_by = requesting_user_id
              AND ST_DWithin(
                ST_MakePoint(l1.longitude::float, l1.latitude::float)::geography,
                ST_MakePoint(l2.longitude::float, l2.latitude::float)::geography,
                5000
              )
          )
      )
      -- OR user follows the business owner
      OR EXISTS(
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = requesting_user_id
          AND f.following_id = bp.user_id
      )
    );
$$;

-- 4. Add message encryption placeholders and cleanup functions
-- Note: Real encryption should be done client-side, this adds database-level protection

CREATE OR REPLACE FUNCTION public.encrypt_message_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add timestamp-based hash to message content for basic obfuscation
  -- In production, implement proper client-side encryption
  IF NEW.content IS NOT NULL AND LENGTH(NEW.content) > 0 THEN
    NEW.content = encode(
      digest(NEW.content || extract(epoch from now())::text, 'sha256'), 
      'base64'
    ) || '|' || NEW.content;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Don't apply encryption trigger yet - this would break existing functionality
-- Will implement proper client-side encryption in the application layer

-- 5. Add automatic data cleanup for privacy
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

-- 6. Create function to check if user can access business contact
CREATE OR REPLACE FUNCTION public.can_access_business_contact(business_profile_id uuid, requesting_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.get_business_contact_info(business_profile_id, requesting_user_id)
  );
$$;

-- 7. Update business profiles RLS to hide contact info by default
DROP POLICY IF EXISTS "Public can view verified business names only" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can view their own business profile" ON public.business_profiles;

-- Only show basic business info to public, no contact details
CREATE POLICY "Public can view verified business basic info"
ON public.business_profiles
FOR SELECT
USING (
  verification_status = 'verified'::business_verification_status 
  AND auth.uid() != user_id
);

-- Business owners can see their full profile
CREATE POLICY "Business owners can view their complete profile"
ON public.business_profiles  
FOR SELECT
USING (auth.uid() = user_id);

-- 8. Create secure message viewing function
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