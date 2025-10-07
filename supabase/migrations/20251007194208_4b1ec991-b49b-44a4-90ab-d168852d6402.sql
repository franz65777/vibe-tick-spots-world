-- Update RLS policies for saved_places to allow viewing other users' saved locations
DROP POLICY IF EXISTS "Users can view their own saved places" ON saved_places;

CREATE POLICY "Users can view all saved places"
ON saved_places
FOR SELECT
TO authenticated
USING (true);

-- Update RLS policies for user_saved_locations to allow viewing other users' saved locations
DROP POLICY IF EXISTS "Users can view their own saved locations" ON user_saved_locations;

CREATE POLICY "Users can view all saved locations"
ON user_saved_locations
FOR SELECT
TO authenticated
USING (true);

-- Keep the insert/delete policies restricted to own data
-- saved_places already has these policies, they remain unchanged
-- user_saved_locations already has these policies, they remain unchanged