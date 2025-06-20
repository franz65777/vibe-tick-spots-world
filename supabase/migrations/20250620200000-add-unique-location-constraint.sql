
-- Add unique constraint on google_place_id to prevent duplicate locations
CREATE UNIQUE INDEX IF NOT EXISTS unique_google_place_id 
ON locations(google_place_id) 
WHERE google_place_id IS NOT NULL;

-- Add comment explaining the constraint
COMMENT ON INDEX unique_google_place_id IS 'Ensures no duplicate location cards are created for the same Google Place';
