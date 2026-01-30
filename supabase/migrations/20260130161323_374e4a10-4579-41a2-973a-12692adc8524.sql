-- Create function to safely increment invited_users_count
CREATE OR REPLACE FUNCTION public.increment_invited_count(inviter_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET invited_users_count = COALESCE(invited_users_count, 0) + 1
  WHERE id = inviter_user_id;
END;
$$;