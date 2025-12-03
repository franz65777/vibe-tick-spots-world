-- Step 1: Fix the incorrect location name from "Bites by Kwanghi" to "Little Basil"
UPDATE locations 
SET name = 'Little Basil',
    updated_at = now()
WHERE id = '595c190a-bba8-4215-9d54-738393704aca';

-- Step 2: Merge duplicate "Osteria 99" locations - keep the first one (55c639f8-11cc-4ebc-8236-0a10612d9845)
-- Update all references to point to the kept location
UPDATE user_saved_locations 
SET location_id = '55c639f8-11cc-4ebc-8236-0a10612d9845'
WHERE location_id = '64b0477a-b824-4551-8ca7-27d05be12ef3';

UPDATE posts 
SET location_id = '55c639f8-11cc-4ebc-8236-0a10612d9845'
WHERE location_id = '64b0477a-b824-4551-8ca7-27d05be12ef3';

UPDATE interactions 
SET location_id = '55c639f8-11cc-4ebc-8236-0a10612d9845'
WHERE location_id = '64b0477a-b824-4551-8ca7-27d05be12ef3';

UPDATE location_likes 
SET location_id = '55c639f8-11cc-4ebc-8236-0a10612d9845'
WHERE location_id = '64b0477a-b824-4551-8ca7-27d05be12ef3';

UPDATE marketing_campaigns 
SET location_id = '55c639f8-11cc-4ebc-8236-0a10612d9845'
WHERE location_id = '64b0477a-b824-4551-8ca7-27d05be12ef3';

-- Delete the duplicate location
DELETE FROM locations WHERE id = '64b0477a-b824-4551-8ca7-27d05be12ef3';

-- Step 3: Create function and unique index to prevent future duplicates
CREATE OR REPLACE FUNCTION normalize_coordinate(coord numeric)
RETURNS numeric AS $$
BEGIN
  RETURN ROUND(coord, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create unique index on normalized coordinates
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_unique_coordinates 
ON locations (normalize_coordinate(latitude), normalize_coordinate(longitude))
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Step 4: Create trigger to handle duplicates gracefully (return existing location instead of error)
CREATE OR REPLACE FUNCTION check_location_duplicate()
RETURNS TRIGGER AS $$
DECLARE
  existing_location_id uuid;
  existing_location_name text;
BEGIN
  -- Check if a location already exists at these coordinates (within ~11m precision)
  SELECT id, name INTO existing_location_id, existing_location_name
  FROM locations
  WHERE ROUND(latitude::numeric, 4) = ROUND(NEW.latitude::numeric, 4)
    AND ROUND(longitude::numeric, 4) = ROUND(NEW.longitude::numeric, 4)
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;
  
  -- If a location exists at these coordinates, raise an exception with the existing ID
  IF existing_location_id IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_LOCATION:% Location already exists at coordinates', existing_location_id
      USING HINT = existing_location_id::text;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to check for duplicates before insert
DROP TRIGGER IF EXISTS check_location_duplicate_trigger ON locations;
CREATE TRIGGER check_location_duplicate_trigger
BEFORE INSERT ON locations
FOR EACH ROW
EXECUTE FUNCTION check_location_duplicate();