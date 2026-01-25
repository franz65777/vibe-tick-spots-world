-- Performance indexes for 20k+ concurrent users
-- Index on saved_places.place_id for fast deduplication lookups
CREATE INDEX IF NOT EXISTS idx_saved_places_place_id 
ON public.saved_places(place_id);

-- Composite index for user + place_id lookups (checking if user already saved)
CREATE INDEX IF NOT EXISTS idx_saved_places_user_place 
ON public.saved_places(user_id, place_id);

-- Index on locations.google_place_id for cache lookups in edge functions
CREATE INDEX IF NOT EXISTS idx_locations_google_place_id 
ON public.locations(google_place_id) 
WHERE google_place_id IS NOT NULL;

-- Index on user_saved_locations for fast user lookup with location
CREATE INDEX IF NOT EXISTS idx_user_saved_locations_user_location 
ON public.user_saved_locations(user_id, location_id);

-- Index for posts location lookups (activity enrichment)
CREATE INDEX IF NOT EXISTS idx_posts_location_created 
ON public.posts(location_id, created_at DESC) 
WHERE location_id IS NOT NULL;