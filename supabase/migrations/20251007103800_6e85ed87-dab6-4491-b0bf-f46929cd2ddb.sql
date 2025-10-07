-- Normalize city names in saved_places table
-- Remove postal district numbers (e.g., "Dublin 2" -> "Dublin")
-- Remove "County" prefix (e.g., "County Dublin" -> "Dublin")

UPDATE saved_places
SET city = TRIM(REGEXP_REPLACE(REGEXP_REPLACE(city, '\s+\d+$', ''), '^County\s+', '', 'i'))
WHERE city IS NOT NULL
  AND (city ~ '\s+\d+$' OR city ~* '^County\s+');

-- Normalize city names in locations table
UPDATE locations
SET city = TRIM(REGEXP_REPLACE(REGEXP_REPLACE(city, '\s+\d+$', ''), '^County\s+', '', 'i'))
WHERE city IS NOT NULL
  AND (city ~ '\s+\d+$' OR city ~* '^County\s+');

-- Set city to NULL for purely numeric postal codes
UPDATE saved_places
SET city = NULL
WHERE city ~ '^\d+$';

UPDATE locations
SET city = NULL
WHERE city ~ '^\d+$';