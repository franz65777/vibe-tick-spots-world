-- Fix PostgREST RPC ambiguity by removing overloaded friend-request RPC signatures

-- Drop any existing overloaded versions (if they exist)
DROP FUNCTION IF EXISTS public.decline_friend_request(p_request_id uuid, p_requester_id uuid);
DROP FUNCTION IF EXISTS public.decline_friend_request(p_request_id uuid);

DROP FUNCTION IF EXISTS public.accept_friend_request(p_request_id uuid, p_requester_id uuid);
DROP FUNCTION IF EXISTS public.accept_friend_request(p_request_id uuid);

-- Recreate single, unambiguous RPCs
CREATE OR REPLACE FUNCTION public.decline_friend_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.friend_requests fr
  SET status = 'declined'::friend_request_status,
      updated_at = now()
  WHERE fr.id = p_request_id
    AND fr.requested_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.friend_requests fr
  SET status = 'accepted'::friend_request_status,
      updated_at = now()
  WHERE fr.id = p_request_id
    AND fr.requested_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decline_friend_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;