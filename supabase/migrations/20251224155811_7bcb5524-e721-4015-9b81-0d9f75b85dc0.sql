-- Update get_city_engagement to count DISTINCT places instead of total saves
CREATE OR REPLACE FUNCTION public.get_city_engagement(p_city text, p_user uuid)
RETURNS TABLE(total_pins bigint, followed_users jsonb)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  normalized_city text;
  dublin_neighborhoods text[] := ARRAY[
    'rathmines', 'ranelagh', 'ballsbridge', 'donnybrook', 'sandymount',
    'ringsend', 'irishtown', 'ballybough', 'drumcondra', 'glasnevin',
    'cabra', 'phibsborough', 'stoneybatter', 'smithfield', 'arbour hill',
    'inchicore', 'kilmainham', 'islandbridge', 'crumlin', 'kimmage',
    'terenure', 'rathgar', 'milltown', 'clonskeagh', 'dundrum',
    'stillorgan', 'blackrock', 'dun laoghaire', 'dalkey', 'killiney',
    'shankill', 'bray', 'greystones', 'howth', 'malahide', 'swords',
    'portmarnock', 'clontarf', 'raheny', 'coolock', 'artane',
    'whitehall', 'santry', 'ballymun', 'finglas', 'blanchardstown',
    'castleknock', 'lucan', 'clondalkin', 'tallaght', 'rathfarnham',
    'templeogue', 'firhouse', 'ballinteer', 'churchtown', 'windy arbour',
    'leopardstown', 'sandyford', 'stepaside', 'foxrock', 'cabinteely',
    'loughlinstown', 'cherrywood', 'carrickmines', 'cornelscourt',
    'donabate', 'rush', 'skerries', 'balbriggan', 'baldoyle',
    'saint james', 'st james', 'the coombe', 'liberties', 'thomas street',
    'christchurch', 'temple bar', 'ballyboden', 'knocklyon', 'brittas'
  ];
BEGIN
  -- Normalize the input city name
  normalized_city := trim(split_part(coalesce(p_city, ''), ',', 1));
  normalized_city := trim(regexp_replace(normalized_city, '\s+\d+$', ''));
  normalized_city := trim(regexp_replace(normalized_city, '^County\s+', '', 'i'));
  
  IF lower(normalized_city) = ANY(dublin_neighborhoods) THEN
    normalized_city := 'Dublin';
  END IF;

  RETURN QUERY
  WITH sp AS (
    SELECT 
      sp.user_id,
      sp.created_at,
      sp.place_id AS unique_place_id,
      CASE 
        WHEN lower(trim(regexp_replace(regexp_replace(COALESCE(sp.city, ''), '\s+\d+$', ''), '^County\s+', '', 'i'))) = ANY(dublin_neighborhoods)
        THEN 'Dublin'
        ELSE trim(regexp_replace(regexp_replace(COALESCE(sp.city, ''), '\s+\d+$', ''), '^County\s+', '', 'i'))
      END AS norm_city
    FROM public.saved_places sp
  ),
  usl AS (
    SELECT 
      usl.user_id,
      usl.created_at,
      COALESCE(l.google_place_id, l.id::text) AS unique_place_id,
      CASE 
        WHEN lower(trim(regexp_replace(regexp_replace(COALESCE(l.city, ''), '\s+\d+$', ''), '^County\s+', '', 'i'))) = ANY(dublin_neighborhoods)
        THEN 'Dublin'
        ELSE trim(regexp_replace(regexp_replace(COALESCE(l.city, ''), '\s+\d+$', ''), '^County\s+', '', 'i'))
      END AS norm_city
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
  ),
  combined AS (
    SELECT user_id, created_at, unique_place_id, norm_city FROM sp
    UNION ALL
    SELECT user_id, created_at, unique_place_id, norm_city FROM usl
  ),
  city_filtered AS (
    SELECT * FROM combined
    WHERE lower(norm_city) = lower(normalized_city)
  ),
  my_follows AS (
    SELECT following_id FROM public.follows WHERE follower_id = p_user
  ),
  saver_latest AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.username,
      p.avatar_url,
      cf.created_at
    FROM city_filtered cf
    JOIN my_follows f ON f.following_id = cf.user_id
    JOIN public.profiles p ON p.id = cf.user_id
    ORDER BY p.id, cf.created_at DESC
  )
  SELECT
    -- COUNT DISTINCT unique places instead of total saves
    (SELECT COUNT(DISTINCT unique_place_id) FROM city_filtered)::bigint AS total_pins,
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

-- Update get_city_engagement_geo to count DISTINCT places
CREATE OR REPLACE FUNCTION public.get_city_engagement_geo(p_lat numeric, p_lng numeric, p_radius_km numeric, p_user uuid)
RETURNS TABLE(total_pins bigint, followed_users jsonb)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
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
  ),
  usl AS (
    SELECT 
      usl.user_id,
      usl.created_at,
      COALESCE(l.google_place_id, l.id::text) AS unique_place_id,
      l.latitude AS lat,
      l.longitude AS lng
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
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
    -- COUNT DISTINCT unique places instead of total saves
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
$$;