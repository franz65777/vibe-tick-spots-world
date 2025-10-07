-- Create geo-based city engagement function using bounding box (no PostGIS required)
CREATE OR REPLACE FUNCTION public.get_city_engagement_geo(
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric,
  p_user uuid
)
RETURNS TABLE(total_pins bigint, followed_users jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  delta_lat numeric := p_radius_km / 111.0; -- ~km per degree latitude
  delta_lng numeric := p_radius_km / (111.0 * COS(radians(p_lat)));
BEGIN
  RETURN QUERY
  WITH sp AS (
    SELECT 
      sp.user_id,
      sp.created_at,
      NULLIF(sp.coordinates->>'lat','')::numeric AS lat,
      NULLIF(sp.coordinates->>'lng','')::numeric AS lng
    FROM public.saved_places sp
    WHERE sp.coordinates IS NOT NULL
  ),
  sp_joined AS (
    -- Fill missing coords from locations if possible
    SELECT 
      COALESCE(sp.lat, l.latitude) AS lat,
      COALESCE(sp.lng, l.longitude) AS lng,
      COALESCE(sp.user_id, usl.user_id) AS user_id,
      COALESCE(sp.created_at, usl.created_at) AS created_at
    FROM sp
    LEFT JOIN public.locations l ON l.google_place_id = NULL -- keep structure; not used
    LEFT JOIN public.user_saved_locations usl ON false
    UNION ALL
    -- Also include internal saved locations with precise coords
    SELECT 
      l.latitude AS lat,
      l.longitude AS lng,
      usl.user_id,
      usl.created_at
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
  ),
  geo_filtered AS (
    SELECT * FROM sp_joined
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
    (SELECT COUNT(*) FROM geo_filtered)::bigint AS total_pins,
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