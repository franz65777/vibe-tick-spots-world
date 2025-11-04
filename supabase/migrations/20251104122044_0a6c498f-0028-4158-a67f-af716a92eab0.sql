-- Add location_id to business_profiles to link businesses to specific locations
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_location_id ON public.business_profiles(location_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON public.business_profiles(user_id);

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Public can view verified business basic info" ON public.business_profiles;
DROP POLICY IF EXISTS "Business owners can view their complete profile" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can view their own business profile" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can update their own business profile" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can insert their own business profile" ON public.business_profiles;

-- Create secure RLS policies
-- Users can only view their own business profiles
CREATE POLICY "Users can view own business"
ON public.business_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own business profiles
CREATE POLICY "Users can update own business"
ON public.business_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can insert their own business profiles
CREATE POLICY "Users can insert own business"
ON public.business_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- For testing: Link current user to B Bar location
INSERT INTO public.business_profiles (
  user_id,
  business_name,
  business_type,
  business_description,
  verification_status,
  location_id
)
VALUES (
  'cf9674e6-0561-4167-8a3c-c0f10fa95a69',
  'B Bar',
  'bar',
  'Test Business Account',
  'verified',
  'cd1d81df-3596-432d-8720-6a9ca31dcec2'
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  location_id = 'cd1d81df-3596-432d-8720-6a9ca31dcec2',
  business_name = 'B Bar',
  business_type = 'bar',
  verification_status = 'verified';

-- Add unique constraint to ensure one business profile per user
ALTER TABLE public.business_profiles 
DROP CONSTRAINT IF EXISTS business_profiles_user_id_key;

ALTER TABLE public.business_profiles 
ADD CONSTRAINT business_profiles_user_id_key UNIQUE (user_id);