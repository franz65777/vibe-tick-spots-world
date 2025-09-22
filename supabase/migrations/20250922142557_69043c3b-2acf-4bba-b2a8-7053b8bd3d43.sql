-- Fix critical security issues with RLS policies

-- 1. Secure user_analytics table - restrict to owner only and add cleanup
DROP POLICY IF EXISTS "Users can only access their own analytics" ON public.user_analytics;
DROP POLICY IF EXISTS "Analytics data auto-cleanup" ON public.user_analytics;

CREATE POLICY "Users can only access their own analytics" 
ON public.user_analytics 
FOR SELECT 
USING (auth.uid() = user_id AND created_at > now() - interval '30 days');

CREATE POLICY "Users can insert their own analytics" 
ON public.user_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Secure business_profiles - hide sensitive contact info from public
DROP POLICY IF EXISTS "Public can view basic business info" ON public.business_profiles;

CREATE POLICY "Public can view verified business names only" 
ON public.business_profiles 
FOR SELECT 
USING (auth.uid() != user_id AND verification_status = 'verified'::business_verification_status);

-- 3. Secure performance_metrics - restrict to owner only
DROP POLICY IF EXISTS "Users can view their own performance metrics" ON public.performance_metrics;

CREATE POLICY "Users can view their own performance metrics" 
ON public.performance_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Secure api_usage - restrict to owner only  
DROP POLICY IF EXISTS "Users can view their own API usage" ON public.api_usage;

CREATE POLICY "Users can view their own API usage" 
ON public.api_usage 
FOR SELECT 
USING (auth.uid() = user_id);

-- 5. Create secure business data function that excludes sensitive info
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
SET search_path = public
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

-- 6. Create cleanup function for old analytics data
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM user_analytics 
  WHERE created_at < now() - interval '30 days';
END;
$$;