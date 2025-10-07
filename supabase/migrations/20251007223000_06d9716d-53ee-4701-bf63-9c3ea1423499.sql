-- Insert a verified business profile for testing
-- This assumes your user_id - replace with actual logged-in user if needed
INSERT INTO public.business_profiles (
  user_id,
  business_name,
  business_type,
  business_description,
  verification_status,
  created_at,
  updated_at
)
SELECT 
  id,
  'Test Business',
  'restaurant',
  'Test business account for development',
  'verified'::business_verification_status,
  now(),
  now()
FROM auth.users
WHERE email IS NOT NULL
LIMIT 1
ON CONFLICT (user_id) DO UPDATE
SET verification_status = 'verified'::business_verification_status;