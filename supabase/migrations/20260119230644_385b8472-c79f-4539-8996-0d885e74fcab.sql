-- Add validation tracking fields to locations table
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS business_status text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_validated boolean DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS validated_at timestamptz;

-- Add index for faster filtering of validated vs non-validated locations
CREATE INDEX IF NOT EXISTS idx_locations_is_validated ON public.locations(is_validated) WHERE is_validated = true;
CREATE INDEX IF NOT EXISTS idx_locations_business_status ON public.locations(business_status) WHERE business_status IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.locations.business_status IS 'Google Places business status: OPERATIONAL, CLOSED_PERMANENTLY, CLOSED_TEMPORARILY';
COMMENT ON COLUMN public.locations.is_validated IS 'Whether this location has been validated via Google Find Place API';
COMMENT ON COLUMN public.locations.validated_at IS 'When the location was last validated';