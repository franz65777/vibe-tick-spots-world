-- Fix get_city_engagement_geo to only count places with valid google_place_id
-- (consistent with get_city_engagement and get_global_city_counts)
CREATE OR REPLACE FUNCTION public.get_city_engagement_geo(p_lat numeric, p_lng numeric, p_radius_km numeric, p_user uuid)
 RETURNS TABLE(total_pins bigint, followed_users jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  delta_lat numeric := p_radius_km / 111.0;
  delta_lng numeric := p_radius_km / (111.0 * COS(radians(p_lat)));
BEGIN
  RETURN QUERY
  WITH sp AS (
    SELECT 
      sp.user_id,
      sp.created_at,
      sp.place_id AS unique_place_id,
      NULLIF(sp.coordinates->>'lat','')::numeric AS lat,
      NULLIF(sp.coordinates->>'lng','')::numeric AS lng
    FROM public.saved_places sp
    WHERE sp.coordinates IS NOT NULL
      AND sp.place_id IS NOT NULL
      AND sp.place_id != ''
  ),
  usl AS (
    SELECT 
      usl.user_id,
      usl.created_at,
      l.google_place_id AS unique_place_id,
      l.latitude AS lat,
      l.longitude AS lng
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.google_place_id IS NOT NULL
      AND l.google_place_id != ''
  ),
  combined AS (
    SELECT user_id, created_at, unique_place_id, lat, lng FROM sp
    UNION ALL
    SELECT user_id, created_at, unique_place_id, lat, lng FROM usl
  ),
  geo_filtered AS (
    SELECT * FROM combined
    WHERE lat IS NOT NULL AND lng IS NOT NULL
      AND lat BETWEEN (p_lat - delta_lat) AND (p_lat + delta_lat)
      AND lng BETWEEN (p_lng - delta_lng) AND (p_lng + delta_lng)
  ),
  my_follows AS (
    SELECT following_id FROM public.follows WHERE follower_id = p_user
  ),
  saver_latest AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.username,
      p.avatar_url,
      g.created_at
    FROM geo_filtered g
    JOIN my_follows f ON f.following_id = g.user_id
    JOIN public.profiles p ON p.id = g.user_id
    ORDER BY p.id, g.created_at DESC
  )
  SELECT
    (SELECT COUNT(DISTINCT unique_place_id) FROM geo_filtered)::bigint AS total_pins,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('id', id, 'username', username, 'avatar_url', avatar_url)
        ORDER BY created_at DESC
      ) FILTER (WHERE id IS NOT NULL),
      '[]'::jsonb
    ) AS followed_users
  FROM saver_latest;
END;
$function$;