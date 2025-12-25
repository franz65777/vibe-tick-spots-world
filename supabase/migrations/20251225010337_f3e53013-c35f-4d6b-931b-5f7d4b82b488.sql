-- Create a helper function to normalize city names globally
CREATE OR REPLACE FUNCTION public.normalize_city_name(city_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text;
  italian_to_english text[][] := ARRAY[
    ['torino', 'Turin'],
    ['milano', 'Milan'],
    ['roma', 'Rome'],
    ['firenze', 'Florence'],
    ['venezia', 'Venice'],
    ['napoli', 'Naples'],
    ['genova', 'Genoa'],
    ['padova', 'Padua'],
    ['mantova', 'Mantua'],
    ['perugia', 'Perugia']
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
  
  -- Clean up the city name
  normalized := trim(split_part(city_name, ',', 1));
  normalized := trim(regexp_replace(normalized, '\s+\d+$', ''));
  normalized := trim(regexp_replace(normalized, '^County\s+', '', 'i'));
  
  -- Check Dublin neighborhoods
  IF lower(normalized) = ANY(dublin_neighborhoods) THEN
    RETURN 'Dublin';
  END IF;
  
  -- Check Italian city names
  FOR i IN 1..array_length(italian_to_english, 1) LOOP
    IF lower(normalized) = italian_to_english[i][1] THEN
      RETURN italian_to_english[i][2];
    END IF;
  END LOOP;
  
  RETURN normalized;
END;
$$;

-- Update get_global_city_counts to use the normalization function
CREATE OR REPLACE FUNCTION public.get_global_city_counts(limit_count integer DEFAULT NULL)
RETURNS TABLE(city text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH all_saves AS (
    SELECT
      normalize_city_name(sp.city) AS norm_city,
      sp.place_id AS place_key
    FROM public.saved_places sp
    WHERE sp.city IS NOT NULL
      AND sp.place_id IS NOT NULL

    UNION

    SELECT
      normalize_city_name(l.city) AS norm_city,
      COALESCE(l.google_place_id, usl.location_id::text) AS place_key
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.city IS NOT NULL
  )
  SELECT
    norm_city AS city,
    COUNT(DISTINCT place_key) AS total
  FROM all_saves
  WHERE norm_city IS NOT NULL
  GROUP BY norm_city
  ORDER BY total DESC
  LIMIT COALESCE(limit_count, 2147483647);
$$;

-- Update get_global_distinct_places_count to use normalization (for consistency)
CREATE OR REPLACE FUNCTION public.get_global_distinct_places_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH all_saves AS (
    SELECT
      sp.place_id AS place_key
    FROM public.saved_places sp
    WHERE sp.city IS NOT NULL
      AND sp.place_id IS NOT NULL

    UNION

    SELECT
      COALESCE(l.google_place_id, usl.location_id::text) AS place_key
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.city IS NOT NULL
  )
  SELECT COUNT(DISTINCT place_key)
  FROM all_saves;
$$;

-- Also update get_city_engagement to use the normalization function
CREATE OR REPLACE FUNCTION public.get_city_engagement(p_city text, p_user uuid)
RETURNS TABLE(total_pins bigint, followed_users jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_city text;
BEGIN
  -- Normalize the input city name
  normalized_city := normalize_city_name(p_city);

  RETURN QUERY
  WITH sp AS (
    SELECT 
      sp.user_id,
      sp.created_at,
      sp.place_id AS unique_place_id,
      normalize_city_name(sp.city) AS norm_city
    FROM public.saved_places sp
    WHERE sp.city IS NOT NULL
  ),
  usl AS (
    SELECT 
      usl.user_id,
      usl.created_at,
      COALESCE(l.google_place_id, l.id::text) AS unique_place_id,
      normalize_city_name(l.city) AS norm_city
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.city IS NOT NULL
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.normalize_city_name(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_city_counts(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_distinct_places_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_city_engagement(text, uuid) TO anon, authenticated;