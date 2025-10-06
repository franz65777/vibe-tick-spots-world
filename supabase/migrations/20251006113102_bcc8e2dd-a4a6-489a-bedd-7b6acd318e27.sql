-- Improve city resolution by joining saved_places with locations by google_place_id
CREATE OR REPLACE FUNCTION public.get_city_engagement(p_city text, p_user uuid)
RETURNS TABLE(total_pins bigint, followed_users jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_city text := trim(split_part(coalesce(p_city, ''), ',', 1));
BEGIN
  RETURN QUERY
  WITH sp AS (
    SELECT 
      sp.user_id,
      sp.created_at,
      COALESCE(sp.city, l.city) AS city
    FROM public.saved_places sp
    LEFT JOIN public.locations l ON l.google_place_id = sp.place_id
    WHERE COALESCE(sp.city, l.city) ILIKE ('%' || normalized_city || '%')
  ),
  il AS (
    SELECT usl.user_id, usl.created_at, l.city
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.city ILIKE ('%' || normalized_city || '%')
  ),
  all_saves AS (
    SELECT user_id, created_at FROM sp
    UNION ALL
    SELECT user_id, created_at FROM il
  ),
  my_follows AS (
    SELECT following_id FROM public.follows WHERE follower_id = p_user
  ),
  saver_latest AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.username,
      p.avatar_url,
      s.created_at
    FROM all_saves s
    JOIN my_follows f ON f.following_id = s.user_id
    JOIN public.profiles p ON p.id = s.user_id
    ORDER BY p.id, s.created_at DESC
  )
  SELECT
    (SELECT COUNT(*) FROM all_saves)::bigint AS total_pins,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('id', id, 'username', username, 'avatar_url', avatar_url)
        ORDER BY created_at DESC
      ) FILTER (WHERE id IS NOT NULL),
      '[]'::jsonb
    ) AS followed_users
  FROM saver_latest;
END;
$$;