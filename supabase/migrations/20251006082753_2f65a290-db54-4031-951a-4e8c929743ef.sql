-- Create places_cache table for caching Google Places API results
CREATE TABLE IF NOT EXISTS public.places_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  radius_km NUMERIC,
  query_type TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_places_cache_key ON public.places_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON public.places_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_places_cache_location ON public.places_cache(latitude, longitude);

-- Enable RLS
ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read cached data
CREATE POLICY "Anyone can read cache"
  ON public.places_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow system to insert/update cache (service role)
CREATE POLICY "Service role can manage cache"
  ON public.places_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.places_cache WHERE expires_at < now();
END;
$$;