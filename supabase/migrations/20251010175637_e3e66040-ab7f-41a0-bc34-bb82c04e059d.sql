-- Create security definer function to check business verification status
CREATE OR REPLACE FUNCTION public.is_verified_business(business_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_profiles
    WHERE user_id = business_user_id
      AND verification_status = 'verified'
  )
$$;

-- Add RLS policy for business_notifications - only verified businesses can create
DROP POLICY IF EXISTS "Business owners can create notifications" ON public.business_notifications;

CREATE POLICY "Only verified businesses can create notifications"
ON public.business_notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE business_profiles.id = business_notifications.business_id
      AND business_profiles.user_id = auth.uid()
      AND business_profiles.verification_status = 'verified'
  )
);

-- Add RLS policy for location_claims - only verified businesses can claim
DROP POLICY IF EXISTS "Business owners can create location claims" ON public.location_claims;

CREATE POLICY "Only verified businesses can create location claims"
ON public.location_claims
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE business_profiles.id = location_claims.business_id
      AND business_profiles.user_id = auth.uid()
      AND business_profiles.verification_status = 'verified'
  )
);