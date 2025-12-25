-- Update normalize_city_name to include Dublino -> Dublin mapping and more translations
CREATE OR REPLACE FUNCTION public.normalize_city_name(city_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- Check Dublin neighborhoods first
  IF lower(normalized) = ANY(dublin_neighborhoods) THEN
    RETURN 'Dublin';
  END IF;
  
  -- Check translation map
  FOR i IN 1..array_length(translation_map, 1) LOOP
    IF lower(normalized) = translation_map[i][1] THEN
      RETURN translation_map[i][2];
    END IF;
  END LOOP;
  
  RETURN normalized;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_city_name(text) TO anon, authenticated;

-- Update get_global_city_counts to use normalize_city_name for proper aggregation
CREATE OR REPLACE FUNCTION public.get_global_city_counts()
RETURNS TABLE(city text, pin_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH city_places AS (
    -- saved_places: place_id is Google Place ID; keep only rows with a city
    SELECT
      public.normalize_city_name(sp.city) AS normalized_city,
      sp.place_id AS unique_place_id
    FROM public.saved_places sp
    WHERE sp.place_id IS NOT NULL AND sp.place_id <> ''
      AND sp.city IS NOT NULL AND trim(sp.city) <> ''

    UNION

    -- user_saved_locations: only locations that have google_place_id; keep only rows with a city
    SELECT
      public.normalize_city_name(l.city) AS normalized_city,
      l.google_place_id AS unique_place_id
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.google_place_id IS NOT NULL AND l.google_place_id <> ''
      AND l.city IS NOT NULL AND trim(l.city) <> ''
  )
  SELECT
    cp.normalized_city AS city,
    COUNT(DISTINCT cp.unique_place_id)::bigint AS pin_count
  FROM city_places cp
  WHERE cp.normalized_city IS NOT NULL
  GROUP BY cp.normalized_city
  ORDER BY pin_count DESC, cp.normalized_city ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_city_counts() TO anon, authenticated;

-- Update get_city_engagement to use normalize_city_name properly
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
      l.google_place_id AS unique_place_id
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

GRANT EXECUTE ON FUNCTION public.get_city_engagement(text, uuid) TO anon, authenticated;