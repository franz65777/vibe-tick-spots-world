
-- Step 1: Add unique constraint on google_place_id to prevent duplicates
-- First, let's handle any existing duplicates by updating posts to point to the oldest location for each google_place_id

-- Update posts to point to the oldest location for each google_place_id
UPDATE posts 
SET location_id = (
  SELECT l_oldest.id 
  FROM locations l_oldest
  WHERE l_oldest.google_place_id = (
    SELECT l_current.google_place_id 
    FROM locations l_current 
    WHERE l_current.id = posts.location_id
  )
  ORDER BY l_oldest.created_at ASC
  LIMIT 1
)
WHERE location_id IN (
  SELECT l.id 
  FROM locations l 
  WHERE l.google_place_id IS NOT NULL
);

-- Delete duplicate locations (keep only the oldest one for each google_place_id)
DELETE FROM locations 
WHERE id NOT IN (
  SELECT DISTINCT ON (google_place_id) id
  FROM locations
  WHERE google_place_id IS NOT NULL
  ORDER BY google_place_id, created_at ASC
) AND google_place_id IS NOT NULL;

-- Now add the unique constraint
ALTER TABLE locations ADD CONSTRAINT unique_google_place_id UNIQUE (google_place_id);

-- Remove any orphaned posts
DELETE FROM posts 
WHERE location_id IS NOT NULL 
AND location_id NOT IN (SELECT id FROM locations);
