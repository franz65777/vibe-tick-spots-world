-- Delete all saved_places entries that have a corresponding location in user_saved_locations
-- This ensures we use only user_saved_locations as the source of truth
DELETE FROM saved_places sp
WHERE EXISTS (
  SELECT 1 FROM locations l
  WHERE (l.google_place_id = sp.place_id OR l.id::text = sp.place_id)
  AND EXISTS (
    SELECT 1 FROM user_saved_locations usl
    WHERE usl.location_id = l.id AND usl.user_id = sp.user_id
  )
);

-- Also delete duplicate user_saved_locations for the same location (keeping newest)
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, location_id ORDER BY created_at DESC) as rn
  FROM user_saved_locations
)
DELETE FROM user_saved_locations WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);