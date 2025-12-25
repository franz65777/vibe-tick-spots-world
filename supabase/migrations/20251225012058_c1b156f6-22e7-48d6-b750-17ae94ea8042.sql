-- Update get_global_city_counts to only count places with google_place_id
CREATE OR REPLACE FUNCTION public.get_global_city_counts()
RETURNS TABLE(city text, pin_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH normalized_cities AS (
    -- From saved_places - only those with place_id (google_place_id)
    SELECT 
      public.normalize_city_name(sp.city) AS normalized_city,
      sp.place_id AS unique_place_id
    FROM public.saved_places sp
    WHERE sp.city IS NOT NULL 
      AND sp.city != ''
      AND sp.place_id IS NOT NULL
      AND sp.place_id != ''
    
    UNION ALL
    
    -- From user_saved_locations joined with locations - only those with google_place_id
    SELECT 
      public.normalize_city_name(l.city) AS normalized_city,
      COALESCE(l.google_place_id, l.id::text) AS unique_place_id
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.city IS NOT NULL 
      AND l.city != ''
      AND l.google_place_id IS NOT NULL
      AND l.google_place_id != ''
  )
  SELECT 
    nc.normalized_city AS city,
    COUNT(DISTINCT nc.unique_place_id) AS pin_count
  FROM normalized_cities nc
  WHERE nc.normalized_city IS NOT NULL
  GROUP BY nc.normalized_city
  ORDER BY pin_count DESC;
$$;

-- Update get_city_engagement to only count places with google_place_id
CREATE OR REPLACE FUNCTION public.get_city_engagement(p_city text, p_user uuid)
RETURNS TABLE(total_pins bigint, followed_users jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_input text;
BEGIN
  normalized_input := public.normalize_city_name(p_city);
  
  RETURN QUERY
  WITH sp AS (
    SELECT 
      sp.user_id,
      sp.created_at,
      sp.place_id AS unique_place_id
    FROM public.saved_places sp
    WHERE public.normalize_city_name(sp.city) = normalized_input
      AND sp.place_id IS NOT NULL
      AND sp.place_id != ''
  ),
  usl AS (
    SELECT 
      usl.user_id,
      usl.created_at,
      COALESCE(l.google_place_id, l.id::text) AS unique_place_id
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE public.normalize_city_name(l.city) = normalized_input
      AND l.google_place_id IS NOT NULL
      AND l.google_place_id != ''
  ),
  combined AS (
    SELECT user_id, created_at, unique_place_id FROM sp
    UNION ALL
    SELECT user_id, created_at, unique_place_id FROM usl
  ),
  my_follows AS (
    SELECT following_id FROM public.follows WHERE follower_id = p_user
  ),
  saver_latest AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.username,
      p.avatar_url,
      c.created_at
    FROM combined c
    JOIN my_follows f ON f.following_id = c.user_id
    JOIN public.profiles p ON p.id = c.user_id
    ORDER BY p.id, c.created_at DESC
  )
  SELECT
    (SELECT COUNT(DISTINCT unique_place_id) FROM combined)::bigint AS total_pins,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_global_city_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_city_engagement(text, uuid) TO anon, authenticated;