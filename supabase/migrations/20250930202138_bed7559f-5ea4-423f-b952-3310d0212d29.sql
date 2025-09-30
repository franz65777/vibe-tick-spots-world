-- Add RLS to the materialized view to secure it
ALTER MATERIALIZED VIEW public.trending_locations OWNER TO postgres;

-- Enable RLS on the materialized view (for newer versions)
-- Note: Materialized views don't support RLS directly, so we'll create a function to access it securely

-- Create a secure function to access trending data
CREATE OR REPLACE FUNCTION get_trending_data()
RETURNS TABLE(
  location_id UUID,
  recent_interactions BIGINT,
  previous_interactions BIGINT,
  trend_ratio DOUBLE PRECISION,
  last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.location_id,
    t.recent_interactions,
    t.previous_interactions,
    t.trend_ratio,
    t.last_updated
  FROM public.trending_locations t;
END;
$$;

-- Grant execute permission only to authenticated users
REVOKE ALL ON FUNCTION get_trending_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_trending_data() TO authenticated;