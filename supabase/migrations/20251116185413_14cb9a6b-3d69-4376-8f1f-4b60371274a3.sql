-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow public username to email lookup for login" ON public.profiles;

-- Create a secure function to lookup email from username
CREATE OR REPLACE FUNCTION public.get_email_from_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE lower(username) = lower(_username)
  LIMIT 1;
$$;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION public.get_email_from_username(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_from_username(text) TO authenticated;