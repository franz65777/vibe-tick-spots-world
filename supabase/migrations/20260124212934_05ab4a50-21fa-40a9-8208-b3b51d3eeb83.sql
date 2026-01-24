-- Fix function search paths for security
ALTER FUNCTION public.clean_city_name(text) SET search_path = public;
ALTER FUNCTION public.normalize_city_name(text) SET search_path = public;
ALTER FUNCTION public.get_location_enrichment_stats() SET search_path = public;