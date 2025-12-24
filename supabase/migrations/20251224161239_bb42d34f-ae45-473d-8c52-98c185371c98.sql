-- Create a function that allows users to remove their own followers
-- This is needed because the current RLS policy only allows deletion by the follower
CREATE OR REPLACE FUNCTION public.remove_follower(follower_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.follows
  WHERE follower_id = follower_user_id
    AND following_id = auth.uid();
END;
$$;