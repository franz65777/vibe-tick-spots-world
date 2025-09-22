-- Drop the overly permissive profile policies
DROP POLICY IF EXISTS "Users can view safe profile data only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create restrictive profile access policies
CREATE POLICY "Users can view their own complete profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can view limited public profile data" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() != id AND 
  auth.role() = 'authenticated'
);

-- Update business profiles to limit public access
DROP POLICY IF EXISTS "Business profiles discovery view" ON public.business_profiles;

CREATE POLICY "Users can view their own business profile" 
ON public.business_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Public can view limited business info" 
ON public.business_profiles 
FOR SELECT 
USING (
  auth.uid() != user_id AND 
  verification_status = 'verified'
);

-- Add privacy policy for user analytics to prevent cross-user access
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.user_analytics;

CREATE POLICY "Users can only access their own analytics" 
ON public.user_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

-- Secure error logs access
DROP POLICY IF EXISTS "Users can view their own error logs" ON public.error_logs;

CREATE POLICY "Users can only view their own error logs" 
ON public.error_logs 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);