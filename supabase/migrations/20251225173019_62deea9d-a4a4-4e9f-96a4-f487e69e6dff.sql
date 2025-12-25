-- Make normalize_city_name case-insensitive and canonicalize unknown cities to Title Case
CREATE OR REPLACE FUNCTION public.normalize_city_name(city_name text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  normalized text;
  translation_map text[][] := ARRAY[
    -- Italian -> English
    ['torino', 'Turin'],
    ['milano', 'Milan'],
    ['roma', 'Rome'],
    ['firenze', 'Florence'],
    ['venezia', 'Venice'],
    ['napoli', 'Naples'],
    ['genova', 'Genoa'],
    ['padova', 'Padua'],
    ['mantova', 'Mantua'],
    ['perugia', 'Perugia'],
    ['dublino', 'Dublin'],
    ['londra', 'London'],
    ['parigi', 'Paris'],
    ['barcellona', 'Barcelona'],
    ['lisbona', 'Lisbon'],
    ['atene', 'Athens'],
    ['vienna', 'Vienna'],
    ['berlino', 'Berlin'],
    ['monaco', 'Munich'],
    ['praga', 'Prague'],
    ['mosca', 'Moscow'],
    ['varsavia', 'Warsaw'],
    ['copenaghen', 'Copenhagen'],
    ['stoccolma', 'Stockholm'],
    ['amsterdam', 'Amsterdam'],
    ['bruxelles', 'Brussels'],
    ['nuova york', 'New York'],
    ['tokio', 'Tokyo'],
    ['pechino', 'Beijing'],
    ['seul', 'Seoul'],
    ['cairo', 'Cairo'],
    ['il cairo', 'Cairo'],
    -- English -> English (canonical form)
    ['turin', 'Turin'],
    ['milan', 'Milan'],
    ['rome', 'Rome'],
    ['florence', 'Florence'],
    ['venice', 'Venice'],
    ['naples', 'Naples'],
    ['genoa', 'Genoa'],
    ['padua', 'Padua'],
    ['mantua', 'Mantua']
  ];
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
  i int;
BEGIN
  IF city_name IS NULL THEN
    RETURN NULL;
  END IF;

  -- Clean up the city name: take first part before comma, remove postal codes
  normalized := trim(split_part(city_name, ',', 1));
  normalized := trim(regexp_replace(normalized, '\s+\d+$', ''));
  normalized := trim(regexp_replace(normalized, '^County\s+', '', 'i'));

  IF normalized = '' THEN
    RETURN NULL;
  END IF;

  -- Check Dublin neighborhoods first (case-insensitive)
  IF lower(normalized) = ANY(dublin_neighborhoods) THEN
    RETURN 'Dublin';
  END IF;

  -- Check translation map (case-insensitive)
  FOR i IN 1..array_length(translation_map, 1) LOOP
    IF lower(normalized) = translation_map[i][1] THEN
      RETURN translation_map[i][2];
    END IF;
  END LOOP;

  -- Default: canonical Title Case so comparisons are consistent
  RETURN initcap(lower(normalized));
END;
$function$;

-- Add stable search_path to get_city_engagement_geo (lint)
CREATE OR REPLACE FUNCTION public.get_city_engagement_geo(p_lat numeric, p_lng numeric, p_radius_km numeric, p_user uuid)
 RETURNS TABLE(total_pins bigint, followed_users jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public'
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