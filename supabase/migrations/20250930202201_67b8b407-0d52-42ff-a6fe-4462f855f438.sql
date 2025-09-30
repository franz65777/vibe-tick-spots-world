-- Revoke all access to the materialized view from API users
REVOKE ALL ON public.trending_locations FROM anon, authenticated;

-- Ensure only the postgres role and functions can access it
GRANT SELECT ON public.trending_locations TO postgres;

-- The view is now only accessible through the get_trending_data() function
-- which is secured with SECURITY DEFINER