-- Add public access policy for verified business profiles
-- This allows everyone to see basic info about verified businesses
CREATE POLICY "Everyone can view verified business profiles basic info"
ON public.business_profiles
FOR SELECT
USING (verification_status = 'verified'::business_verification_status);

-- Add policy for admins to view all business profiles
CREATE POLICY "Admins can view all business profiles"
ON public.business_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));