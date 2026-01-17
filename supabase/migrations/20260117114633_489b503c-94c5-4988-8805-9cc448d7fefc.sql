-- Add column to mark locations where Google Place ID was not found
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS google_place_not_found_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_locations_google_place_not_found_at ON public.locations(google_place_not_found_at);

-- Comment for documentation
COMMENT ON COLUMN public.locations.google_place_not_found_at IS 'Timestamp when Google Find Place API failed to find this location. NULL means not yet searched or found successfully.';