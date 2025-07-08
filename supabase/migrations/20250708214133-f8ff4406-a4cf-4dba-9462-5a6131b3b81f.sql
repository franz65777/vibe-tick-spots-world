-- Fix the get_location_of_the_week function to resolve ambiguous column reference
DROP FUNCTION IF EXISTS public.get_location_of_the_week();

CREATE OR REPLACE FUNCTION public.get_location_of_the_week()
 RETURNS TABLE(location_id uuid, location_name text, location_category text, location_address text, latitude numeric, longitude numeric, image_url text, total_likes integer, total_saves integer, total_score integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.category,
    l.address,
    l.latitude,
    l.longitude,
    l.image_url,
    COALESCE(wlm.likes_count, 0) as total_likes,
    COALESCE(wlm.saves_count, 0) as total_saves,
    COALESCE(wlm.likes_count * 2 + wlm.saves_count, 0) as total_score
  FROM public.locations l
  LEFT JOIN public.weekly_location_metrics wlm ON l.id = wlm.location_id 
    AND wlm.week_start = DATE_TRUNC('week', CURRENT_DATE)
  WHERE l.category ILIKE '%library%' 
    OR l.category ILIKE '%book%'
    OR l.name ILIKE '%library%'
    OR l.name ILIKE '%book%'
  ORDER BY total_score DESC, total_likes DESC
  LIMIT 1;
END;
$function$;

-- Fix search_history constraint - allow only valid search types
ALTER TABLE public.search_history DROP CONSTRAINT IF EXISTS search_history_search_type_check;
ALTER TABLE public.search_history ADD CONSTRAINT search_history_search_type_check 
  CHECK (search_type IN ('locations', 'users'));

-- Add index to improve location queries by google_place_id for deduplication
CREATE INDEX IF NOT EXISTS idx_locations_google_place_id ON public.locations(google_place_id) WHERE google_place_id IS NOT NULL;