-- 1) Count only places with google_place_id in global distinct places
CREATE OR REPLACE FUNCTION public.get_global_distinct_places_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH all_places AS (
    -- saved_places: place_id is Google Place ID
    SELECT sp.place_id AS unique_place_id
    FROM public.saved_places sp
    WHERE sp.place_id IS NOT NULL AND sp.place_id != ''

    UNION

    -- internal locations: only those with google_place_id
    SELECT l.google_place_id AS unique_place_id
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.google_place_id IS NOT NULL AND l.google_place_id != ''
  )
  SELECT COUNT(DISTINCT unique_place_id) FROM all_places;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_distinct_places_count() TO anon, authenticated;

-- 2) Safe decline helper to avoid uuid/text filter issues in PostgREST
CREATE OR REPLACE FUNCTION public.decline_friend_request(
  p_request_id uuid DEFAULT NULL,
  p_requester_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_request_id IS NULL AND p_requester_id IS NULL THEN
    RAISE EXCEPTION 'Missing request identifier';
  END IF;

  -- Identify the request row (must belong to current user as requested)
  SELECT fr.id
  INTO v_id
  FROM public.friend_requests fr
  WHERE fr.requested_id = auth.uid()
    AND fr.status = 'pending'::friend_request_status
    AND (
      (p_request_id IS NOT NULL AND fr.id = p_request_id)
      OR (p_requester_id IS NOT NULL AND fr.requester_id = p_requester_id)
    )
  ORDER BY fr.created_at DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.friend_requests
  SET status = 'declined'::friend_request_status,
      updated_at = now()
  WHERE id = v_id;

  -- Delete declined row to avoid lingering old requests
  DELETE FROM public.friend_requests
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_friend_request(uuid, uuid) TO authenticated;