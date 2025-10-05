-- Fix get_city_engagement to count unique pins correctly and be more robust
CREATE OR REPLACE FUNCTION public.get_city_engagement(p_city text)
RETURNS TABLE(total_pins integer, followed_users jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  normalized_city text := split_part(coalesce(p_city, ''), ',', 1);
  followed jsonb := '[]'::jsonb;
BEGIN
  -- Total unique pins across saved_places (Google) and user_saved_locations (internal)
  WITH sp AS (
    SELECT DISTINCT place_id::text AS uid
    FROM public.saved_places
    WHERE city ILIKE ('%' || normalized_city || '%')
  ),
  il AS (
    SELECT DISTINCT l.id::text AS uid
    FROM public.locations l
    JOIN public.user_saved_locations usl ON usl.location_id = l.id
    WHERE l.city ILIKE ('%' || normalized_city || '%')
  ),
  union_ids AS (
    -- Use UNION (distinct) to avoid double-counting across sources
    SELECT uid FROM sp
    UNION
    SELECT uid FROM il
  )
  SELECT COUNT(*) INTO total_pins FROM union_ids;

  -- Followed users who have saves in this city (limit 3)
  WITH my_follows AS (
    SELECT following_id FROM public.follows WHERE follower_id = auth.uid()
  ),
  users_from_sp AS (
    SELECT DISTINCT s.user_id
    FROM public.saved_places s
    JOIN my_follows f ON f.following_id = s.user_id
    WHERE s.city ILIKE ('%' || normalized_city || '%')
  ),
  users_from_usl AS (
    SELECT DISTINCT usl.user_id
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    JOIN my_follows f ON f.following_id = usl.user_id
    WHERE l.city ILIKE ('%' || normalized_city || '%')
  ),
  users_all AS (
    SELECT DISTINCT user_id AS id FROM (
      SELECT user_id FROM users_from_sp
      UNION
      SELECT user_id FROM users_from_usl
    ) u
    LIMIT 3
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'avatar_url', p.avatar_url)), '[]'::jsonb)
  INTO followed
  FROM users_all ua
  JOIN public.profiles p ON p.id = ua.id;

  followed_users := followed;
  RETURN NEXT;
END;
$function$;

-- New function: get_pin_engagement
CREATE OR REPLACE FUNCTION public.get_pin_engagement(p_location_id uuid, p_google_place_id text)
RETURNS TABLE(total_saves integer, followed_users jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total INTEGER := 0;
  followers jsonb := '[]'::jsonb;
BEGIN
  -- Collect distinct user ids who saved this pin either via internal locations or google saved_places
  WITH usl_users AS (
    SELECT DISTINCT user_id
    FROM public.user_saved_locations
    WHERE p_location_id IS NOT NULL AND location_id = p_location_id
  ),
  sp_users AS (
    SELECT DISTINCT user_id
    FROM public.saved_places
    WHERE p_google_place_id IS NOT NULL AND place_id = p_google_place_id
  ),
  all_users AS (
    SELECT user_id FROM usl_users
    UNION
    SELECT user_id FROM sp_users
  )
  SELECT COUNT(*) INTO total FROM all_users;

  total_saves := COALESCE(total, 0);

  -- Followed users among the savers (limit 3)
  WITH my_follows AS (
    SELECT following_id FROM public.follows WHERE follower_id = auth.uid()
  ),
  saver_ids AS (
    SELECT user_id FROM (
      SELECT user_id FROM usl_users
      UNION
      SELECT user_id FROM sp_users
    ) t
  ),
  followed_savers AS (
    SELECT s.user_id
    FROM saver_ids s
    JOIN my_follows f ON f.following_id = s.user_id
    LIMIT 3
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'avatar_url', p.avatar_url)), '[]'::jsonb)
  INTO followers
  FROM followed_savers fs
  JOIN public.profiles p ON p.id = fs.user_id;

  followed_users := followers;
  RETURN NEXT;
END;
$function$;