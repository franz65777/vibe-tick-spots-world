-- Add columns for location seeding system
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS osm_id text UNIQUE,
ADD COLUMN IF NOT EXISTS is_system_seeded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS needs_enrichment boolean DEFAULT true;

-- Create index for efficient OSM deduplication
CREATE INDEX IF NOT EXISTS idx_locations_osm_id ON public.locations(osm_id) WHERE osm_id IS NOT NULL;

-- Create index for system-seeded locations
CREATE INDEX IF NOT EXISTS idx_locations_system_seeded ON public.locations(is_system_seeded) WHERE is_system_seeded = true;

-- Create index for locations needing enrichment
CREATE INDEX IF NOT EXISTS idx_locations_needs_enrichment ON public.locations(needs_enrichment) WHERE needs_enrichment = true;