-- Global, privacy-safe aggregates for saved places across the app
-- Returns only aggregated counts (no user ids), so it's safe to expose via SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.get_global_distinct_places_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH all_saves AS (
    -- Google places saves
    SELECT
      sp.city,
      sp.place_id AS place_key
    FROM public.saved_places sp
    WHERE sp.city IS NOT NULL
      AND sp.place_id IS NOT NULL

    UNION

    -- Internal location saves (dedupe via google_place_id when available)
    SELECT
      l.city,
      COALESCE(l.google_place_id, usl.location_id::text) AS place_key
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.city IS NOT NULL
  )
  SELECT COUNT(DISTINCT place_key)
  FROM all_saves;
$$;


CREATE OR REPLACE FUNCTION public.get_global_city_counts(limit_count integer DEFAULT NULL)
RETURNS TABLE(city text, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH all_saves AS (
    SELECT
      sp.city,
      sp.place_id AS place_key
    FROM public.saved_places sp
    WHERE sp.city IS NOT NULL
      AND sp.place_id IS NOT NULL

    UNION

    SELECT
      l.city,
      COALESCE(l.google_place_id, usl.location_id::text) AS place_key
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.city IS NOT NULL
  )
  SELECT
    city,
    COUNT(DISTINCT place_key) AS total
  FROM all_saves
  GROUP BY city
  ORDER BY total DESC
  LIMIT COALESCE(limit_count, 2147483647);
$$;

-- Allow calling these RPCs from the client/edge functions
GRANT EXECUTE ON FUNCTION public.get_global_distinct_places_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_city_counts(integer) TO anon, authenticated;
