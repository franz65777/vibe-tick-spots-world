-- Remove overloaded get_global_city_counts(limit_count int) to avoid PostgREST ambiguity
DROP FUNCTION IF EXISTS public.get_global_city_counts(integer);

-- Ensure a single canonical signature exists (no-arg)
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
      lower(trim(split_part(sp.city, ',', 1))) AS city_key,
      trim(split_part(sp.city, ',', 1)) AS city,
      sp.place_id AS unique_place_id
    FROM public.saved_places sp
    WHERE sp.place_id IS NOT NULL AND sp.place_id <> ''
      AND sp.city IS NOT NULL AND trim(sp.city) <> ''

    UNION

    -- user_saved_locations: only locations that have google_place_id; keep only rows with a city
    SELECT
      lower(trim(split_part(l.city, ',', 1))) AS city_key,
      trim(split_part(l.city, ',', 1)) AS city,
      l.google_place_id AS unique_place_id
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.google_place_id IS NOT NULL AND l.google_place_id <> ''
      AND l.city IS NOT NULL AND trim(l.city) <> ''
  )
  SELECT
    city_places.city,
    COUNT(DISTINCT city_places.unique_place_id)::bigint AS pin_count
  FROM city_places
  GROUP BY city_places.city_key, city_places.city
  ORDER BY pin_count DESC, city_places.city ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_city_counts() TO anon, authenticated;