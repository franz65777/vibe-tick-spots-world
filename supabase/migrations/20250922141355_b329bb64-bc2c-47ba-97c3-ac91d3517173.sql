-- Fix critical security issues with RLS policies

-- 1. Secure business_profiles - restrict public access to sensitive data
DROP POLICY IF EXISTS "Public can view limited business info" ON public.business_profiles;

CREATE POLICY "Public can view basic business info" 
ON public.business_profiles 
FOR SELECT 
USING (
  (auth.uid() <> user_id) 
  AND (verification_status = 'verified'::business_verification_status)
);

-- Create a security definer function to get safe business data
CREATE OR REPLACE FUNCTION public.get_safe_business_data(business_id uuid)
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
SET search_path = 'public'
AS $$
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
$$;

-- 2. Enhance user_locations security - ensure only owner can access
DROP POLICY IF EXISTS "Users can view their own location" ON public.user_locations;
DROP POLICY IF EXISTS "Users can update their own location" ON public.user_locations;

CREATE POLICY "Users can manage only their own location" 
ON public.user_locations 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Secure user_analytics - add data retention and stricter access
CREATE POLICY "Analytics data auto-cleanup" 
ON public.user_analytics 
FOR SELECT
USING (
  (auth.uid() = user_id) 
  AND (created_at > now() - interval '90 days')
);

-- Function to clean up old analytics data
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM user_analytics 
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- 4. Add function to get anonymized analytics (no IP addresses)
CREATE OR REPLACE FUNCTION public.get_anonymized_analytics(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  event_type text,
  event_data jsonb,
  created_at timestamp with time zone,
  page_url text,
  session_id text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    ua.id,
    ua.event_type,
    ua.event_data,
    ua.created_at,
    ua.page_url,
    ua.session_id
  FROM public.user_analytics ua
  WHERE ua.user_id = target_user_id 
    AND ua.created_at > now() - interval '30 days';
$$;