-- Performance indexes for location searches (Add page optimization)
-- These indexes improve coordinate-based and name-based location lookups

-- Index for coordinate-based searches (used in post creation)
CREATE INDEX IF NOT EXISTS idx_locations_lat_lng 
ON locations(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for name-based searches with case-insensitive matching
CREATE INDEX IF NOT EXISTS idx_locations_name_lower 
ON locations(lower(name));

-- Compound index for user saved locations (used in auto-save)
CREATE INDEX IF NOT EXISTS idx_user_saved_locations_user_location_tag 
ON user_saved_locations(user_id, location_id, save_tag);