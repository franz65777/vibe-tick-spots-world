-- Add opening hours caching columns to locations table
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS opening_hours_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS opening_hours_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS opening_hours_source TEXT DEFAULT NULL;

-- Create index for efficient queries on locations with cached hours
CREATE INDEX IF NOT EXISTS idx_locations_opening_hours_fetched ON public.locations(opening_hours_fetched_at) WHERE opening_hours_fetched_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.locations.opening_hours_data IS 'Cached opening hours data from Google Places API or OSM';
COMMENT ON COLUMN public.locations.opening_hours_fetched_at IS 'When the opening hours were last fetched';
COMMENT ON COLUMN public.locations.opening_hours_source IS 'Source of opening hours data: google, osm, or manual';