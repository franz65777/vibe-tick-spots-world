
-- Update saved_places with numeric or invalid city names using reverse geocoding
-- This will help ensure all places have proper city names

-- First, let's create a function to clean up city names from postal codes
CREATE OR REPLACE FUNCTION clean_city_name(city_input text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove postal district numbers (e.g., "Dublin 2" -> "Dublin", "22" -> NULL)
  IF city_input IS NULL OR city_input = '' OR city_input = 'Unknown' THEN
    RETURN NULL;
  END IF;
  
  -- If it's just a number, return NULL
  IF city_input ~ '^\d+$' THEN
    RETURN NULL;
  END IF;
  
  -- Remove trailing numbers (postal codes)
  RETURN trim(regexp_replace(city_input, '\s+\d+$', ''));
END;
$$;

-- Update saved_places to clean city names
UPDATE saved_places
SET city = clean_city_name(city)
WHERE city IS NOT NULL;

-- Update locations to clean city names
UPDATE locations
SET city = clean_city_name(city)
WHERE city IS NOT NULL;
