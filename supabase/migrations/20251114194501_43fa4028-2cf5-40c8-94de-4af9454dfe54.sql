-- Fix existing business posts to have is_business_post = true
UPDATE posts 
SET is_business_post = true
WHERE user_id IN (
  SELECT user_id FROM business_profiles WHERE verification_status = 'verified'
) 
AND content_type IN ('discount', 'event', 'promotion', 'announcement')
AND (is_business_post IS NULL OR is_business_post = false);

-- Create function to automatically set is_business_post for business users
CREATE OR REPLACE FUNCTION public.set_business_post_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is a verified business
  IF EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE user_id = NEW.user_id 
    AND verification_status = 'verified'::business_verification_status
  ) THEN
    -- Set is_business_post to true for special content types
    IF NEW.content_type IN ('discount', 'event', 'promotion', 'announcement') THEN
      NEW.is_business_post = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert on posts
DROP TRIGGER IF EXISTS set_business_post_flag_trigger ON posts;
CREATE TRIGGER set_business_post_flag_trigger
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_business_post_flag();