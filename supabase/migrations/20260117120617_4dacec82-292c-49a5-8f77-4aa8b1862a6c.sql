-- First delete related google_api_costs records for orphan locations
DELETE FROM public.google_api_costs 
WHERE location_id IN (
  SELECT id FROM public.locations 
  WHERE google_place_id IS NULL 
     OR google_place_id = '' 
     OR google_place_id NOT LIKE 'ChIJ%'
);

-- Delete orphan locations without valid Google Place ID
-- These locations cannot be enriched and waste API calls
DELETE FROM public.locations 
WHERE google_place_id IS NULL 
   OR google_place_id = '' 
   OR google_place_id NOT LIKE 'ChIJ%';

-- Drop the google_place_not_found_at column since we now delete instead of mark
ALTER TABLE public.locations DROP COLUMN IF EXISTS google_place_not_found_at;

-- Drop the index as well
DROP INDEX IF EXISTS public.idx_locations_not_found_on_google;